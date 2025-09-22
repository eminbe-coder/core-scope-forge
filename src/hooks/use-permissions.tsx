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
  getVisibilityLevel: (entityType: string) => Promise<string>;
  canViewEntity: (entityType: string, entityUserId: string, entityUserDepartment?: string, entityUserBranch?: string) => Promise<boolean>;
  getAssignmentScope: (entityType: string) => Promise<string>;
  canAssignTo: (entityType: string, targetUserId: string) => Promise<boolean>;
  isAdmin: boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  userPermissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  getVisibilityLevel: async () => 'own',
  canViewEntity: async () => false,
  getAssignmentScope: async () => 'own',
  canAssignTo: async () => false,
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
      'todos': 'todos',
      'reports': 'reports'
    };

    Object.keys(customPermissions).forEach(module => {
      const modulePerms = customPermissions[module];
      const dbModule = moduleMap[module as keyof typeof moduleMap];
      
      if (dbModule && modulePerms && typeof modulePerms === 'object') {
        // Handle visibility permissions
        if (modulePerms.visibility) {
          mappedPermissions.push(`${dbModule}.visibility.${modulePerms.visibility}`);
        }
        
        // Handle assignment scope permissions
        if (modulePerms.assignment_scope) {
          mappedPermissions.push(`${dbModule}.assignment.${modulePerms.assignment_scope}`);
        }
        
        // Handle action permissions
        Object.keys(modulePerms).forEach(action => {
          if (modulePerms[action] === true && action !== 'visibility' && action !== 'assignment_scope') {
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

  const getVisibilityLevel = async (entityType: string): Promise<string> => {
    if (isAdmin) return 'all';

    // Check if user has a custom role with direct visibility setting
    const currentMembership = userTenants.find(m => m.tenant_id === currentTenant?.id);
    
    if (currentMembership?.custom_role_id) {
      try {
        const { data: customRole, error } = await supabase
          .from('custom_roles')
          .select('permissions')
          .eq('id', currentMembership.custom_role_id)
          .eq('active', true)
          .maybeSingle();
        
        if (!error && customRole?.permissions) {
          // Check direct visibility setting in custom role
          if (customRole.permissions[entityType]?.visibility) {
            return customRole.permissions[entityType].visibility;
          }
        }
      } catch (error) {
        console.error('Error fetching custom role visibility:', error);
      }
    }

    // Check which visibility permission the user has for this entity type
    const visibilityPermissions = [
      `${entityType}.visibility.all`,
      `${entityType}.visibility.selected_users`,
      `${entityType}.visibility.branch`,
      `${entityType}.visibility.department`,
      `${entityType}.visibility.own`
    ];

    for (const permission of visibilityPermissions) {
      if (hasPermission(permission)) {
        return permission.split('.').pop() || 'own';
      }
    }

    // For todos, check if user has broader entity permissions
    if (entityType === 'todos') {
      const broadEntityTypes = ['companies', 'contacts', 'deals', 'sites', 'projects'];
      for (const broadType of broadEntityTypes) {
        if (hasPermission(`${broadType}.visibility.all`)) {
          return 'all';
        }
        if (hasPermission(`${broadType}.visibility.branch`)) {
          return 'branch';
        }
        if (hasPermission(`${broadType}.visibility.department`)) {
          return 'department';
        }
      }
    }

    return 'own'; // Default to own only
  };

  const canViewEntity = async (
    entityType: string, 
    entityUserId: string, 
    entityUserDepartment?: string, 
    entityUserBranch?: string
  ): Promise<boolean> => {
    if (isAdmin) return true;
    if (!user || !currentTenant) return false;

    const visibilityLevel = await getVisibilityLevel(entityType);
    
    switch (visibilityLevel) {
      case 'all':
        return true;
      
      case 'own':
        return entityUserId === user.id;
      
      case 'department':
        if (!entityUserDepartment) return false;
        // Get current user's department
        const { data: userDept } = await supabase
          .from('user_department_assignments')
          .select('department_id')
          .eq('user_id', user.id)
          .eq('tenant_id', currentTenant.id)
          .maybeSingle();
        
        if (!userDept) return false;
        
        // Check if entity user is in same department
        const { data: entityUserDept } = await supabase
          .from('user_department_assignments')
          .select('department_id')
          .eq('user_id', entityUserId)
          .eq('tenant_id', currentTenant.id)
          .maybeSingle();
        
        return entityUserDept?.department_id === userDept.department_id;
      
      case 'branch':
        if (!entityUserBranch) return false;
        // Get current user's branch through department
        const { data: userBranch } = await supabase
          .from('user_department_assignments')
          .select(`
            departments (
              branch_id
            )
          `)
          .eq('user_id', user.id)
          .eq('tenant_id', currentTenant.id)
          .maybeSingle();
        
        if (!userBranch?.departments?.branch_id) return false;
        
        // Get entity user's branch
        const { data: entityBranch } = await supabase
          .from('user_department_assignments')
          .select(`
            departments (
              branch_id
            )
          `)
          .eq('user_id', entityUserId)
          .eq('tenant_id', currentTenant.id)
          .maybeSingle();
        
        return entityBranch?.departments?.branch_id === userBranch.departments.branch_id;
      
      case 'selected_users':
        // Get allowed user IDs from custom role permissions
        const currentMembership = userTenants.find(m => m.tenant_id === currentTenant.id);
        
        if (currentMembership?.custom_role_id) {
          const { data: customRole } = await supabase
            .from('custom_roles')
            .select('permissions')
            .eq('id', currentMembership.custom_role_id)
            .eq('active', true)
            .maybeSingle();
          
          if (customRole?.permissions[entityType]?.visibility_selected_users) {
            const allowedUserIds = customRole.permissions[entityType].visibility_selected_users;
            return allowedUserIds.includes(entityUserId);
          }
        }
        
        return false;
      
      default:
        return false;
    }
  };

  const getAssignmentScope = async (entityType: string): Promise<string> => {
    if (!user || !currentTenant) return 'own';
    
    // Check if user has custom role with assignment permissions
    const currentMembership = userTenants.find(m => m.tenant_id === currentTenant.id);
    
    if (currentMembership?.custom_role_id) {
      const { data: customRole, error } = await supabase
        .from('custom_roles')
        .select('permissions')
        .eq('id', currentMembership.custom_role_id)
        .eq('active', true)
        .maybeSingle();
      
      if (!error && customRole?.permissions[entityType]?.assignment_scope) {
        return customRole.permissions[entityType].assignment_scope;
      }
    }
    
    // Fall back to database function
    try {
      const { data, error } = await supabase.rpc('get_user_assignment_scope', {
        _user_id: user.id,
        _tenant_id: currentTenant.id,
        _entity_type: entityType,
      });
      
      if (error) throw error;
      return data || 'own';
    } catch (error) {
      console.error('Error getting assignment scope:', error);
      return 'own';
    }
  };

  const canAssignTo = async (entityType: string, targetUserId: string): Promise<boolean> => {
    if (!user || !currentTenant) return false;
    
    // Admin can assign to anyone
    if (isAdmin) return true;
    
    // Can always assign to self
    if (user.id === targetUserId) return true;
    
    // Get assignment scope
    const assignmentScope = await getAssignmentScope(entityType);
    
    switch (assignmentScope) {
      case 'all':
        return true;
      
      case 'selected_users':
        // Check if target user is in the allowed list
        const currentMembership = userTenants.find(m => m.tenant_id === currentTenant.id);
        
        if (currentMembership?.custom_role_id) {
          const { data: customRole } = await supabase
            .from('custom_roles')
            .select('permissions')
            .eq('id', currentMembership.custom_role_id)
            .eq('active', true)
            .maybeSingle();
          
          if (customRole?.permissions[entityType]?.assignment_selected_users) {
            const allowedUserIds = customRole.permissions[entityType].assignment_selected_users;
            return allowedUserIds.includes(targetUserId);
          }
        }
        
        return false;
      
      default:
        // Fall back to database function for other scopes
        try {
          const { data, error } = await supabase.rpc('can_user_assign_to', {
            _assigner_id: user.id,
            _assignee_id: targetUserId,
            _tenant_id: currentTenant.id,
            _entity_type: entityType,
          });
          
          if (error) throw error;
          return data || false;
        } catch (error) {
          console.error('Error checking assignment permission:', error);
          return false;
        }
    }
  };

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        userPermissions,
        hasPermission,
        hasAnyPermission,
        getVisibilityLevel,
        canViewEntity,
        getAssignmentScope,
        canAssignTo,
        isAdmin,
        loading,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};