import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Building, Settings, UserPlus, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TenantForm } from '@/components/forms/TenantForm';
import { CreateUserModal } from '@/components/forms/CreateUserModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TenantData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  active: boolean;
  company_location?: string;
  cr_number?: string;
  tax_number?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
  _count?: {
    memberships: number;
  };
}

export default function Admin() {
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [showEditTenant, setShowEditTenant] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const { toast } = useToast();
  const { isSuperAdmin, userRole, isAdmin } = useTenant();

  const fetchTenants = async () => {
    try {
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .rpc('get_all_tenants_for_super_admin');
        
        if (error) throw error;
        setTenants(data || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchMemberships = async () => {
    try {
      if (isSuperAdmin) {
        const { data, error } = await supabase
          .rpc('get_all_tenant_memberships_for_super_admin');
        
        if (error) throw error;
        setMemberships(data || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (isSuperAdmin) {
        await Promise.all([fetchTenants(), fetchMemberships()]);
      }
      setLoading(false);
    };

    loadData();
  }, [isSuperAdmin]);

  const handleCreateSuccess = () => {
    setShowCreateTenant(false);
    setShowEditTenant(false);
    setSelectedTenant(null);
    fetchTenants();
    toast({
      title: 'Success',
      description: selectedTenant ? 'Tenant updated successfully' : 'Tenant created successfully',
    });
  };

  const openEditTenant = (tenant: TenantData) => {
    setSelectedTenant(tenant);
    setShowEditTenant(true);
  };

  const openCreateUserModal = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setShowCreateUser(true);
  };

  const handleUserCreateSuccess = () => {
    setShowCreateUser(false);
    fetchMemberships();
    toast({
      title: 'Success',
      description: 'User created successfully',
    });
  };

  const toggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ active: !currentStatus })
        .eq('id', tenantId);

      if (error) throw error;

      await fetchTenants();
      toast({
        title: 'Success',
        description: `Tenant ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  console.log('Admin Panel Debug:', {
    isAdmin,
    isSuperAdmin,
    userRole,
    user: 'moaath@bukaai.com' // just for debugging
  });

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
              Debug: isAdmin={String(isAdmin)}, isSuperAdmin={String(isSuperAdmin)}, userRole={userRole}
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? 'Manage tenants and users across the platform' : 'System administration and management'}
            </p>
          </div>
          <Badge variant={isSuperAdmin ? "destructive" : "secondary"} className="text-lg px-3 py-1">
            {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
          </Badge>
        </div>

        {isSuperAdmin && (
          <>
            {/* Tenant Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Tenant Management
                  </CardTitle>
                  <CardDescription>
                    Create and manage tenants across the platform
                  </CardDescription>
                </div>
                <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Tenant
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Tenant</DialogTitle>
                      <DialogDescription>
                        Add a new tenant to the platform
                      </DialogDescription>
                    </DialogHeader>
                    <TenantForm 
                      onSuccess={handleCreateSuccess}
                      onCancel={() => setShowCreateTenant(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            {tenant.domain && (
                              <div className="text-sm text-muted-foreground">{tenant.domain}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{tenant.slug}</TableCell>
                        <TableCell>{tenant.company_location || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={tenant.active ? 'default' : 'secondary'}>
                            {tenant.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditTenant(tenant)}
                              title="Edit Tenant"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openCreateUserModal(tenant.id)}
                              title="Add User"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleTenantStatus(tenant.id, tenant.active)}
                            >
                              {tenant.active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user access and roles across all tenants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell>
                          {membership.user_profile?.first_name} {membership.user_profile?.last_name}
                        </TableCell>
                        <TableCell>{membership.user_profile?.email}</TableCell>
                        <TableCell>{membership.tenant?.name}</TableCell>
                        <TableCell>
                          <Badge variant={membership.role === 'super_admin' ? 'destructive' : membership.role === 'admin' ? 'default' : 'secondary'}>
                            {membership.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={membership.active ? 'default' : 'secondary'}>
                            {membership.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(membership.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {!isSuperAdmin && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  User Management
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  Total active users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  System Settings
                </CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-muted-foreground">
                  Configuration items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Permissions
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">
                  Role permissions
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Tenant Dialog */}
      <Dialog open={showEditTenant} onOpenChange={setShowEditTenant}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information and settings
            </DialogDescription>
          </DialogHeader>
          <TenantForm 
            tenant={selectedTenant || undefined}
            onSuccess={handleCreateSuccess}
            onCancel={() => {
              setShowEditTenant(false);
              setSelectedTenant(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <CreateUserModal
        open={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        tenantId={selectedTenantId}
        onSuccess={handleUserCreateSuccess}
      />
    </DashboardLayout>
  );
}