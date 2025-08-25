import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: any;
  active: boolean;
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
    
    // Find user role in this tenant
    const membership = userTenants.find(m => m.tenant_id === tenant.id);
    setUserRole(membership?.role || null);
  };

  const refreshTenants = async () => {
    if (!user) return;

    try {
      // Super admins can see all tenants
      if (user?.email === 'moaath@essensia.bh') {
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
            settings: tenant.settings
          }
        })) || [];
        
        setUserTenants(mappedTenants);
        setUserRole('super_admin');
        if (mappedTenants.length > 0 && !currentTenant) {
          await setCurrentTenant(mappedTenants[0].tenant);
        }
        return;
      }
      
      // Regular users - fetch their tenant memberships
      const { data, error } = await supabase
        .from('user_tenant_memberships')
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          active,
          tenant:tenants(*)
        `)
        .eq('user_id', user.id)
        .eq('active', true);

      if (error) throw error;

      setUserTenants(data || []);

      // Set current tenant if not set
      if (data && data.length > 0 && !currentTenant) {
        const savedTenantId = localStorage.getItem('currentTenantId');
        const savedTenant = data.find(m => m.tenant_id === savedTenantId);
        const tenantToSet = savedTenant || data[0];
        await setCurrentTenant(tenantToSet.tenant);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
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
      refreshTenants
    }}>
      {children}
    </TenantContext.Provider>
  );
};