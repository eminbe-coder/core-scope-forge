import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  active: boolean;
  country?: string;
  company_location?: string;
  cr_number?: string;
  tax_number?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_phone_country_code?: string;
  contact_phone_number?: string;
  default_currency_id?: string;
  settings: any;
  created_at?: string;
  updated_at?: string;
}

interface UserTenantMembership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'owner' | 'admin' | 'member' | 'super_admin';
  custom_role_id?: string;
  active: boolean;
  tenant: Tenant;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  userTenants: UserTenantMembership[];
  userRole: string | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasGlobalAccess: boolean;
  setCurrentTenant: (tenant: Tenant) => void;
  refreshTenants: () => void;
  refreshCurrentTenant: () => void;
}

const TenantContext = createContext<TenantContextType>({
  currentTenant: null,
  userTenants: [],
  userRole: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  hasGlobalAccess: false,
  setCurrentTenant: () => {},
  refreshTenants: () => {},
  refreshCurrentTenant: () => {},
});

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, session } = useAuth();
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [userTenants, setUserTenants] = useState<UserTenantMembership[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is admin or super admin
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';
  
  // Check if user has global system access (only super_admin in Platform tenant)
  const hasGlobalAccess = userTenants.some(membership => 
    membership.role === 'super_admin' && membership.tenant.slug === 'platform'
  );

  const setCurrentTenant = async (tenant: Tenant) => {
    setCurrentTenantState(tenant);
    localStorage.setItem('currentTenantId', tenant.id);
    
    // Find user role in this specific tenant
    const membership = userTenants.find(m => m.tenant_id === tenant.id);
    if (membership?.role) {
      setUserRole(membership.role);
    }
  };

  const refreshCurrentTenant = async () => {
    if (!currentTenant || !user) return;

    try {
      // Refresh the current tenant data from the database
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          id, name, slug, domain, active, country, company_location, 
          cr_number, tax_number, contact_email, contact_phone_country_code,
          contact_phone_number, default_currency_id, settings, created_at, updated_at
        `)
        .eq('id', currentTenant.id)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentTenantState(data);
        // Also update in userTenants array
        setUserTenants(prev => prev.map(membership => 
          membership.tenant_id === data.id 
            ? { ...membership, tenant: data }
            : membership
        ));
      }
    } catch (error) {
      console.error('Error refreshing current tenant:', error);
    }
  };

  const refreshTenants = async () => {
    if (!user) {
      console.log('No user, skipping tenant refresh');
      return;
    }
    console.log('refreshTenants called for user:', user.id);

    try {
      setLoading(true);
      
      // Check if user is a super admin by querying their memberships
      const { data: superAdminCheck, error: superAdminError } = await supabase
        .from('user_tenant_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .eq('active', true)
        .limit(1);

      console.log('Super admin check result:', { superAdminCheck, superAdminError });
      if (superAdminError) throw superAdminError;

      // Check if user is super admin in Platform tenant specifically
      const platformSuperAdmin = superAdminCheck?.find(membership => {
        // We need to get the tenant info for this membership to check the slug
        return membership.role === 'super_admin';
      });

      if (platformSuperAdmin) {
        console.log('User is super admin, checking Platform tenant access');
        
        // Get user's actual tenant memberships (only tenants they're explicitly members of)
        const { data: userMemberships, error: userMembershipsError } = await supabase
          .from('user_tenant_memberships')
          .select(`
            id,
            user_id,
            tenant_id,
            role,
            custom_role_id,
            active,
            tenant:tenants(
              id, name, slug, domain, active, country, company_location, 
              cr_number, tax_number, contact_email, contact_phone_country_code,
              contact_phone_number, default_currency_id, settings, created_at, updated_at
            )
          `)
          .eq('user_id', user.id)
          .eq('active', true);

        console.log('User memberships for super admin:', { userMemberships, userMembershipsError });
        if (userMembershipsError) throw userMembershipsError;

        if (userMemberships && userMemberships.length > 0) {
          setUserTenants(userMemberships);
          
          // Set current tenant and role
          if (!currentTenant) {
            const savedTenantId = localStorage.getItem('currentTenantId');
            const savedTenant = userMemberships.find(m => m.tenant_id === savedTenantId);
            const tenantToSet = savedTenant || userMemberships[0];
            
            console.log('Setting current tenant and role for super admin:', { 
              tenant: tenantToSet.tenant, 
              role: tenantToSet.role 
            });
            
            setUserRole(tenantToSet.role);
            setCurrentTenantState(tenantToSet.tenant);
            localStorage.setItem('currentTenantId', tenantToSet.tenant.id);
          } else {
            // Update role for current tenant
            const currentMembership = userMemberships.find(m => m.tenant_id === currentTenant.id);
            if (currentMembership) {
              console.log('Setting user role for current tenant:', currentMembership.role);
              setUserRole(currentMembership.role);
            }
          }
        }
        return;
      }
      
      // Regular users - fetch their tenant memberships with all tenant fields
      console.log('Fetching regular user tenant memberships');
      const { data, error } = await supabase
        .from('user_tenant_memberships')
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          custom_role_id,
          active,
          tenant:tenants(
            id, name, slug, domain, active, country, company_location, 
            cr_number, tax_number, contact_email, contact_phone_country_code,
            contact_phone_number, default_currency_id, settings, created_at, updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('active', true);

      console.log('User tenant memberships query result:', { data, error });
      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn('No tenant memberships found for user:', user.id);
        setUserTenants([]);
        setLoading(false);
        return;
      }

      setUserTenants(data);

      // Set current tenant and role if not set
      if (!currentTenant) {
        const savedTenantId = localStorage.getItem('currentTenantId');
        const savedTenant = data.find(m => m.tenant_id === savedTenantId);
        const tenantToSet = savedTenant || data[0];
        
        console.log('Setting current tenant and role:', { 
          tenant: tenantToSet.tenant, 
          role: tenantToSet.role 
        });
        
        setUserRole(tenantToSet.role);
        setCurrentTenantState(tenantToSet.tenant);
        localStorage.setItem('currentTenantId', tenantToSet.tenant.id);
      } else {
        // Update role for current tenant if not set
        const currentMembership = data.find(m => m.tenant_id === currentTenant.id);
        if (currentMembership && !userRole) {
          console.log('Setting user role for current tenant:', currentMembership.role);
          setUserRole(currentMembership.role);
        }
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      console.log('User ID when error occurred:', user?.id);
      // Set empty state to prevent infinite loading
      setUserTenants([]);
      setUserRole(null);
      setCurrentTenantState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshTenants();
    } else {
      setCurrentTenantState(null);
      setUserTenants([]);
      setUserRole(null);
      setLoading(false);
    }
  }, [user]);

  return (
    <TenantContext.Provider value={{
      currentTenant,
      userTenants,
      userRole,
      loading,
      isAdmin,
      isSuperAdmin,
      hasGlobalAccess,
      setCurrentTenant,
      refreshTenants,
      refreshCurrentTenant
    }}>
      {children}
    </TenantContext.Provider>
  );
};