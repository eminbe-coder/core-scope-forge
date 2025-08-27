import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './use-tenant';
import { useAuth } from './use-auth';

interface Permission {
  id: string;
  name: string;
  module: string;
  description?: string;
}

interface PermissionsContextType {
  permissions: Permission[];
  userPermissions: string[];
  hasPermission: (permissionName: string) => boolean;
  hasAnyPermission: (permissionNames: string[]) => boolean;
  isAdmin: boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  userPermissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  isAdmin: false,
  loading: true,
});

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { currentTenant, userRole } = useTenant();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin (admin or super_admin)
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const fetchPermissions = async () => {
    if (!user || !currentTenant || !userRole) {
      setLoading(false);
      return;
    }

    try {
      // If user is admin or super_admin, they have all permissions
      if (isAdmin) {
        const { data: allPermissions, error: permError } = await supabase
          .from('permissions')
          .select('*')
          .order('module', { ascending: true });

        if (permError) throw permError;

        setPermissions(allPermissions || []);
        setUserPermissions((allPermissions || []).map(p => p.name));
        setLoading(false);
        return;
      }

      // For non-admin users, fetch role-based permissions
      const { data: rolePermissions, error } = await supabase
        .from('role_permissions')
        .select(`
          permission_id,
          permissions (
            id,
            name,
            module,
            description
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('role', userRole as any);

      if (error) throw error;

      const permissionList = rolePermissions
        ?.map(rp => rp.permissions)
        .filter(Boolean) as Permission[];

      setPermissions(permissionList || []);
      setUserPermissions((permissionList || []).map(p => p.name));
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
      setUserPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [user, currentTenant, userRole]);

  const hasPermission = (permissionName: string): boolean => {
    return isAdmin || userPermissions.includes(permissionName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return isAdmin || permissionNames.some(permission => userPermissions.includes(permission));
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        userPermissions,
        hasPermission,
        hasAnyPermission,
        isAdmin,
        loading,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};