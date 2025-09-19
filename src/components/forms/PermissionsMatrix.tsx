import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelectDropdown } from '@/components/deals/MultiSelectDropdown';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface PermissionsMatrixProps {
  permissions: any;
  onChange: (permissions: any) => void;
}

  const MODULES = [
    { key: 'companies', label: 'Companies' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'sites', label: 'Sites' },
    { key: 'leads', label: 'Leads' },
    { key: 'customers', label: 'Customers' },
    { key: 'deals', label: 'Deals' },
    { key: 'activities', label: 'Activities' },
    { key: 'projects', label: 'Projects' },
    { key: 'devices', label: 'Devices' },
    { key: 'todos', label: 'Todos' },
    { key: 'settings', label: 'Settings' },
    { key: 'recycle_bin', label: 'Recycle Bin' },
  ];

const CRUD_PERMISSIONS = [
  { key: 'read', label: 'Read' },
  { key: 'write', label: 'Write' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

const REPORT_PERMISSIONS = [
  { key: 'view', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
  { key: 'generate', label: 'Generate' },
];

const VISIBILITY_MODULES = [
  { key: 'deals', label: 'Deals' },
  { key: 'leads', label: 'Leads' },
  { key: 'activities', label: 'Activities' },
  { key: 'todos', label: 'Todos' },
];

const ASSIGNMENT_MODULES = [
  { key: 'deals', label: 'Deal Assignment' },
  { key: 'leads', label: 'Lead Assignment' },
  { key: 'todos', label: 'Todo Assignment' },
  { key: 'activities', label: 'Activity Assignment' },
];

const ASSIGNMENT_OPTIONS = [
  { value: 'own', label: 'Only Self' },
  { value: 'department', label: 'Department Team' },
  { value: 'branch', label: 'Branch Team' },
  { value: 'selected_users', label: 'Selected Users' },
  { value: 'all', label: 'All Users' },
];

const VISIBILITY_OPTIONS = [
  { value: 'own', label: 'Only My Records' },
  { value: 'department', label: 'My Department' },
  { value: 'branch', label: 'My Branch' },
  { value: 'selected_users', label: 'Selected Users' },
  { value: 'all', label: 'All Records' },
];

interface User {
  id: string;
  name: string;
}

export const PermissionsMatrix = ({ permissions, onChange }: PermissionsMatrixProps) => {
  const [localPermissions, setLocalPermissions] = useState(permissions || {});
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { currentTenant } = useTenant();

  useEffect(() => {
    setLocalPermissions(permissions || {});
  }, [permissions]);

  // Fetch users when component mounts
  useEffect(() => {
    if (currentTenant) {
      fetchUsers();
    }
  }, [currentTenant]);

  const fetchUsers = async () => {
    if (!currentTenant) return;
    
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('user_tenant_memberships')
        .select(`
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      if (error) throw error;

      const userList = data?.map(membership => ({
        id: membership.user_id,
        name: `${membership.profiles?.first_name || ''} ${membership.profiles?.last_name || ''}`.trim() || 
              membership.profiles?.email ||
              `User ${membership.user_id.slice(0, 8)}`
      })) || [];

      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handlePermissionChange = (module: string, permission: string, checked: boolean) => {
    const updatedPermissions = {
      ...localPermissions,
      [module]: {
        ...localPermissions[module],
        [permission]: checked
      }
    };
    setLocalPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  const handleVisibilityChange = (module: string, value: string) => {
    const updatedPermissions = {
      ...localPermissions,
      [module]: {
        ...localPermissions[module],
        visibility: value,
        // Clear selected users if changing from selected_users
        ...(value !== 'selected_users' && localPermissions[module]?.visibility_selected_users ? 
          { visibility_selected_users: [] } : {})
      }
    };
    setLocalPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  const handleAssignmentChange = (module: string, value: string) => {
    const updatedPermissions = {
      ...localPermissions,
      [module]: {
        ...localPermissions[module],
        assignment_scope: value,
        // Clear selected users if changing from selected_users
        ...(value !== 'selected_users' && localPermissions[module]?.assignment_selected_users ? 
          { assignment_selected_users: [] } : {})
      }
    };
    setLocalPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  const handleVisibilityUsersChange = (module: string, selectedUserIds: string[]) => {
    const updatedPermissions = {
      ...localPermissions,
      [module]: {
        ...localPermissions[module],
        visibility_selected_users: selectedUserIds
      }
    };
    setLocalPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  const handleAssignmentUsersChange = (module: string, selectedUserIds: string[]) => {
    const updatedPermissions = {
      ...localPermissions,
      [module]: {
        ...localPermissions[module],
        assignment_selected_users: selectedUserIds
      }
    };
    setLocalPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  const isChecked = (module: string, permission: string) => {
    return localPermissions[module]?.[permission] || false;
  };

  const getVisibility = (module: string) => {
    return localPermissions[module]?.visibility || 'own';
  };

  const getAssignmentScope = (module: string) => {
    return localPermissions[module]?.assignment_scope || 'own';
  };

  const getVisibilitySelectedUsers = (module: string) => {
    return localPermissions[module]?.visibility_selected_users || [];
  };

  const getAssignmentSelectedUsers = (module: string) => {
    return localPermissions[module]?.assignment_selected_users || [];
  };

  return (
    <div className="space-y-6">
      {/* Module Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Module Permissions</CardTitle>
          <CardDescription>
            Configure access permissions for different modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Module</th>
                  {CRUD_PERMISSIONS.map(permission => (
                    <th key={permission.key} className="text-center p-2 font-medium min-w-[80px]">
                      {permission.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(module => (
                  <tr key={module.key} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{module.label}</td>
                    {CRUD_PERMISSIONS.map(permission => (
                      <td key={permission.key} className="text-center p-2">
                        <Checkbox
                          checked={isChecked(module.key, permission.key)}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(module.key, permission.key, checked as boolean)
                          }
                          id={`${module.key}-${permission.key}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Visibility Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Data Visibility Permissions</CardTitle>
          <CardDescription>
            Configure what data users can see within each module. This controls which records users can view and filter by.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {VISIBILITY_MODULES.map(module => (
              <div key={module.key} className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label className="font-medium">{module.label}</Label>
                  <Select 
                    value={getVisibility(module.key)} 
                    onValueChange={(value) => handleVisibilityChange(module.key, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {getVisibility(module.key) === 'selected_users' && (
                  <div className="ml-3 p-3 border-l-2 border-primary/20 bg-muted/50 rounded-r-md">
                    <Label className="text-sm font-medium mb-2 block">Select Users</Label>
                    <MultiSelectDropdown
                      options={users}
                      selected={getVisibilitySelectedUsers(module.key)}
                      onSelectionChange={(selected) => handleVisibilityUsersChange(module.key, selected)}
                      placeholder="Choose users..."
                      searchPlaceholder="Search users..."
                      disabled={loadingUsers}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reports Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Reports Permissions</CardTitle>
          <CardDescription>
            Configure access permissions for reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {REPORT_PERMISSIONS.map(permission => (
              <div key={permission.key} className="flex items-center space-x-2">
                <Checkbox
                  checked={isChecked('reports', permission.key)}
                  onCheckedChange={(checked) => 
                    handlePermissionChange('reports', permission.key, checked as boolean)
                  }
                  id={`reports-${permission.key}`}
                />
                <Label htmlFor={`reports-${permission.key}`} className="text-sm font-medium">
                  {permission.label} Reports
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Permissions</CardTitle>
          <CardDescription>
            Configure who users can assign entities to. This controls the scope of users available in assignment dropdowns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ASSIGNMENT_MODULES.map(module => (
              <div key={module.key} className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <Label className="font-medium">{module.label}</Label>
                  <Select 
                    value={getAssignmentScope(module.key)} 
                    onValueChange={(value) => handleAssignmentChange(module.key, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {getAssignmentScope(module.key) === 'selected_users' && (
                  <div className="ml-3 p-3 border-l-2 border-primary/20 bg-muted/50 rounded-r-md">
                    <Label className="text-sm font-medium mb-2 block">Select Users</Label>
                    <MultiSelectDropdown
                      options={users}
                      selected={getAssignmentSelectedUsers(module.key)}
                      onSelectionChange={(selected) => handleAssignmentUsersChange(module.key, selected)}
                      placeholder="Choose users..."
                      searchPlaceholder="Search users..."
                      disabled={loadingUsers}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};