import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Search, Users, Plus, Edit, Trash2, Key, Shield } from 'lucide-react';
import { EditUserModal } from '@/components/forms/EditUserModal';
import { CreateUserModal } from '@/components/forms/CreateUserModal';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PermissionsMatrix } from '@/components/forms/PermissionsMatrix';

interface TenantUser {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  active: boolean;
  custom_role_id?: string;
  created_at: string;
  user_profile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  custom_role?: {
    id: string;
    name: string;
    description: string;
    permissions: any;
  };
}

interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  permissions: any;
  active: boolean;
  created_at: string;
}

const UsersRoles = () => {
  const { currentTenant, isAdmin } = useTenant();
  const { toast } = useToast();
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: {} });
  const roleNameExists = newRole.name.trim() && customRoles.some(r => r.name.toLowerCase() === newRole.name.trim().toLowerCase());

  useEffect(() => {
    if (currentTenant && isAdmin) {
      fetchTenantData();
    }
  }, [currentTenant, isAdmin]);

  const fetchTenantData = async () => {
    if (!currentTenant) return;
    
    try {
      setLoading(true);
      
      // Fetch tenant users with custom roles
      const { data: users, error: usersError } = await supabase
        .from('user_tenant_memberships')
        .select(`
          *,
          user_profile:profiles(*),
          custom_role:custom_roles(*)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);
      
      if (usersError) throw usersError;
      
      // Fetch custom roles
      const { data: roles, error: rolesError } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');
      
      if (rolesError) throw rolesError;
      
      setTenantUsers(users || []);
      setCustomRoles(roles || []);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tenant data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCustomRole = async () => {
    if (!currentTenant || !newRole.name.trim()) return;
    
    try {
      const payload = {
        tenant_id: currentTenant.id,
        name: newRole.name.trim(),
        description: newRole.description?.trim() || null,
        permissions: newRole.permissions || {}
      } as const;

      const { data, error } = await supabase
        .from('custom_roles')
        .insert(payload)
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Role "${data?.name}" created successfully`,
      });
      
      setShowCreateRole(false);
      setNewRole({ name: '', description: '', permissions: {} });
      fetchTenantData();
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create custom role",
        variant: "destructive",
      });
    }
  };

  const deleteCustomRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from('custom_roles')
        .update({ active: false })
        .eq('id', roleId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Custom role deleted successfully",
      });
      
      fetchTenantData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "Failed to delete custom role",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Deactivate user membership instead of hard delete
      const { error } = await supabase
        .from('user_tenant_memberships')
        .update({ active: false })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "User removed from tenant successfully",
      });
      
      fetchTenantData();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to remove user from tenant",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = tenantUsers.filter(user => {
    const matchesSearch = 
      user.user_profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_profile.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_profile.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole || 
                       (user.custom_role && user.custom_role.name === selectedRole);
    
    return matchesSearch && matchesRole;
  });

  const uniqueRoles = Array.from(
    new Set([
      ...tenantUsers.map(u => u.role),
      ...tenantUsers.filter(u => u.custom_role).map(u => u.custom_role!.name)
    ])
  );

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You need admin privileges to access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Users & Roles</h1>
          <p className="text-muted-foreground">
            Manage users and roles for {currentTenant?.name}
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="roles">Custom Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Tenant Users
                    </CardTitle>
                    <CardDescription>
                      Manage users in your tenant
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateUser(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="all">All Roles</option>
                    {uniqueRoles.map((role) => (
                      <option key={role} value={role}>
                        {role.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              {user.user_profile.first_name} {user.user_profile.last_name}
                            </TableCell>
                            <TableCell>{user.user_profile.email}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={user.role === 'admin' ? 'default' : 'secondary'}
                              >
                                {user.custom_role ? user.custom_role.name : user.role.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.active ? 'default' : 'secondary'}>
                                {user.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingUser(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteUser(user.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Custom Roles
                    </CardTitle>
                    <CardDescription>
                      Create and manage custom roles for your tenant
                    </CardDescription>
                  </div>
                  <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Role
                      </Button>
                    </DialogTrigger>
                     <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                       <DialogHeader>
                         <DialogTitle>Create Custom Role</DialogTitle>
                         <DialogDescription>
                           Define a new role with specific permissions for your tenant.
                         </DialogDescription>
                       </DialogHeader>
                       <div className="space-y-6">
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <Label htmlFor="role-name">Role Name</Label>
                             <Input
                               id="role-name"
                               value={newRole.name}
                               onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                               placeholder="e.g., Project Manager"
                             />
                             {roleNameExists && (
                               <p className="mt-1 text-xs text-destructive">A role with this name already exists.</p>
                             )}
                           </div>
                           <div>
                             <Label htmlFor="role-description">Description</Label>
                             <Textarea
                               id="role-description"
                               value={newRole.description}
                               onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                               placeholder="Describe the role responsibilities..."
                               rows={3}
                             />
                           </div>
                         </div>
                         
                         <PermissionsMatrix
                           permissions={newRole.permissions}
                           onChange={(permissions) => setNewRole({ ...newRole, permissions })}
                         />
                       </div>
                       <DialogFooter>
                         <Button variant="outline" onClick={() => setShowCreateRole(false)}>
                           Cancel
                         </Button>
                          <Button onClick={createCustomRole} disabled={!newRole.name.trim() || !!roleNameExists}>
                            Create Role
                          </Button>
                       </DialogFooter>
                     </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : customRoles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No custom roles created yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        customRoles.map((role) => (
                          <TableRow key={role.id}>
                            <TableCell className="font-medium">{role.name}</TableCell>
                            <TableCell>{role.description || '-'}</TableCell>
                            <TableCell>{new Date(role.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRole(role)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCustomRole(role.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {editingUser && (
          <EditUserModal
            membership={{
              ...editingUser,
              role: editingUser.role as 'super_admin' | 'admin' | 'member'
            }}
            open={!!editingUser}
            onClose={() => setEditingUser(null)}
            onSuccess={() => {
              setEditingUser(null);
              fetchTenantData();
            }}
            onDelete={() => {
              setEditingUser(null);
              fetchTenantData();
            }}
          />
        )}

        {showCreateUser && currentTenant && (
          <CreateUserModal
            open={showCreateUser}
            onClose={() => setShowCreateUser(false)}
            tenantId={currentTenant.id}
            onSuccess={() => {
              setShowCreateUser(false);
              fetchTenantData();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default UsersRoles;
