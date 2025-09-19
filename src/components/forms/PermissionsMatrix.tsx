import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
];

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All Records' },
  { value: 'own', label: 'Only My Records' },
];

export const PermissionsMatrix = ({ permissions, onChange }: PermissionsMatrixProps) => {
  const [localPermissions, setLocalPermissions] = useState(permissions || {});

  useEffect(() => {
    setLocalPermissions(permissions || {});
  }, [permissions]);

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
        visibility: value
      }
    };
    setLocalPermissions(updatedPermissions);
    onChange(updatedPermissions);
  };

  const isChecked = (module: string, permission: string) => {
    return localPermissions[module]?.[permission] || false;
  };

  const getVisibility = (module: string) => {
    return localPermissions[module]?.visibility || 'all';
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
            Configure what data users can see within each module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {VISIBILITY_MODULES.map(module => (
              <div key={module.key} className="flex items-center justify-between p-3 border rounded-md">
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
    </div>
  );
};