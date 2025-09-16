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

  const setCurrentTenant = async (tenant: Tenant) => {
    setCurrentTenantState(tenant);
    localStorage.setItem('currentTenantId', tenant.id);
    
    // Find user role in this tenant - but if we're already super admin, keep that role
    if (userRole !== 'super_admin') {
      const membership = userTenants.find(m => m.tenant_id === tenant.id);
      // Only update if we actually found a role for this tenant; don't overwrite with null
      if (membership?.role) {
        setUserRole(membership.role);
      }
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
    if (!user) return;
    console.log('refreshTenants called for user:', user.id);

    try {
      // Check if user is a super admin by querying their memberships
      const { data: superAdminCheck, error: superAdminError } = await supabase
        .from('user_tenant_memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .eq('active', true)
        .limit(1);

      if (superAdminError) throw superAdminError;

      // If user is super admin, load all tenants
      if (superAdminCheck && superAdminCheck.length > 0) {
        const { data: allTenants, error: allTenantsError } = await supabase
          .rpc('get_all_tenants_for_super_admin');
        
        if (allTenantsError) throw allTenantsError;
        
        const mappedTenants = allTenants?.map(tenant => ({
          id: tenant.id,
          user_id: user.id,
          tenant_id: tenant.id,
          role: 'super_admin' as const,
          active: true,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            domain: tenant.domain,
            active: tenant.active,
            country: (tenant as any).country,
            company_location: (tenant as any).company_location,
            cr_number: (tenant as any).cr_number,
            tax_number: (tenant as any).tax_number,
            contact_email: (tenant as any).contact_email,
            contact_phone_country_code: (tenant as any).contact_phone_country_code,
            contact_phone_number: (tenant as any).contact_phone_number,
            settings: tenant.settings,
            default_currency_id: tenant.default_currency_id
          }
        })) || [];
        
        setUserTenants(mappedTenants);
        setUserRole('super_admin');
        
        // Set current tenant if not already set
        if (mappedTenants.length > 0 && !currentTenant) {
          setCurrentTenantState(mappedTenants[0].tenant);
          localStorage.setItem('currentTenantId', mappedTenants[0].tenant.id);
        }
        return;
      }
      
      // Regular users - fetch their tenant memberships with all tenant fields
      const { data, error } = await supabase
        .from('user_tenant_memberships')
        .select(`
          id,
          user_id,
          tenant_id,
          role,
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

      setUserTenants(data || []);

      // Set current tenant if not set
      if (data && data.length > 0 && !currentTenant) {
        const savedTenantId = localStorage.getItem('currentTenantId');
        const savedTenant = data.find(m => m.tenant_id === savedTenantId);
        const tenantToSet = savedTenant || data[0];
        setUserRole(tenantToSet.role); // Set user role for this tenant
        await setCurrentTenant(tenantToSet.tenant);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      console.log('User ID when error occurred:', user?.id);
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
      setCurrentTenant,
      refreshTenants,
      refreshCurrentTenant
    }}>
      {children}
    </TenantContext.Provider>
  );
};