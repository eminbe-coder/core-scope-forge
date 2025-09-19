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
  const { currentTenant, userRole, userTenants } = useTenant();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is admin (admin or super_admin)
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Map custom role permissions to database permission format and UI format
  const mapCustomRolePermissions = (customPermissions: any): string[] => {
    const mappedPermissions: string[] = [];
    
    if (!customPermissions || typeof customPermissions !== 'object') {
      return mappedPermissions;
    }

    // Map from custom role format to database permission format
    const moduleMap = {
      'companies': 'crm.customers',
      'customers': 'crm.customers', 
      'contacts': 'crm.contacts',
      'leads': 'crm.contacts',
      'deals': 'crm.deals',
      'sites': 'crm.sites',
      'activities': 'crm.activities',
      'projects': 'projects',
      'devices': 'devices',
      'reports': 'reports'
    };

    Object.keys(customPermissions).forEach(module => {
      const modulePerms = customPermissions[module];
      const dbModule = moduleMap[module as keyof typeof moduleMap];
      
      if (dbModule && modulePerms && typeof modulePerms === 'object') {
        Object.keys(modulePerms).forEach(action => {
          if (modulePerms[action] === true && action !== 'visibility') {
            const dbAction = action === 'read' ? 'view' : action;
            
            // Add database format permission (dot notation)
            mappedPermissions.push(`${dbModule}.${dbAction}`);
            
            // Also add UI format permission (underscore notation) for Reports page compatibility
            if (module === 'reports') {
              mappedPermissions.push(`reports_${action}`);
              if (action === 'generate') {
                mappedPermissions.push('reports_create'); // Map generate to create as well
              }
            }
          }
        });
      }
    });

    return mappedPermissions;
  };

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

      // Check if user has a custom role assigned
      const currentMembership = userTenants.find(m => m.tenant_id === currentTenant.id);
      
      if (currentMembership?.custom_role_id) {
        // User has a custom role, fetch permissions from custom role
        const { data: customRole, error: customRoleError } = await supabase
          .from('custom_roles')
          .select('permissions')
          .eq('id', currentMembership.custom_role_id)
          .eq('active', true)
          .maybeSingle();

        if (customRoleError) throw customRoleError;

        if (customRole) {
          const mappedPermissions = mapCustomRolePermissions(customRole.permissions);
          setPermissions([]); // Custom roles don't need full permission objects
          setUserPermissions(mappedPermissions);
          setLoading(false);
          return;
        }
      }

      // For regular role-based permissions (member, admin roles)
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
  }, [user, currentTenant, userRole, userTenants]);

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