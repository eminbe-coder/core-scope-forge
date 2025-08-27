import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Building, Settings, UserPlus, Edit, Search, Filter, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TenantForm } from '@/components/forms/TenantForm';
import { CreateUserModal } from '@/components/forms/CreateUserModal';
import { EditUserModal } from '@/components/forms/EditUserModal';
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
  const [filteredMemberships, setFilteredMemberships] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [showEditTenant, setShowEditTenant] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedMembership, setSelectedMembership] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTenant, setFilterTenant] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const { toast } = useToast();
  const { isSuperAdmin, userRole, isAdmin, loading: tenantLoading } = useTenant();

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

  // Filter memberships based on search and filters
  useEffect(() => {
    let filtered = memberships;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(membership => 
        membership.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        membership.user_profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        membership.user_profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tenant filter
    if (filterTenant !== 'all') {
      filtered = filtered.filter(membership => membership.tenant_id === filterTenant);
    }

    // Role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(membership => membership.role === filterRole);
    }

    setFilteredMemberships(filtered);
  }, [memberships, searchTerm, filterTenant, filterRole]);

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      if (isSuperAdmin) {
        await Promise.all([fetchTenants(), fetchMemberships()]);
      }
      setDataLoading(false);
    };

    if (!tenantLoading) {
      loadData();
    }
  }, [isSuperAdmin, tenantLoading]);

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

  const openEditUserModal = (membership: any) => {
    setSelectedMembership(membership);
    setShowEditUser(true);
  };

  const handleUserEditSuccess = () => {
    setShowEditUser(false);
    setSelectedMembership(null);
    fetchMemberships();
    toast({
      title: 'Success',
      description: 'User updated successfully',
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

  // Wait for tenant loading to complete before checking access
  if (tenantLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading admin panel...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isSuperAdmin ? 'Global Admin Panel' : 'Tenant Administration'}
            </h1>
            <p className="text-muted-foreground">
              {isSuperAdmin 
                ? 'Manage tenants and users across the platform' 
                : 'Manage your tenant settings and users'
              }
            </p>
          </div>
          <Badge variant={isSuperAdmin ? "destructive" : "secondary"} className="text-lg px-3 py-1">
            {userRole === 'super_admin' ? 'Super Admin' : 'Tenant Admin'}
          </Badge>
        </div>

        {/* Tenant Admin Features - Always visible to both admin types */}
        <div className="grid gap-6">
          {/* CRM Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                CRM Settings
              </CardTitle>
              <CardDescription>
                Configure CRM settings for {isSuperAdmin ? 'any tenant' : 'your tenant'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.href = '/settings?tab=crm'}
                variant="outline"
                className="w-full justify-start"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Deal Stages
              </Button>
            </CardContent>
          </Card>

          {/* User Management for Current Tenant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage users in {isSuperAdmin ? 'all tenants' : 'your tenant'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                User management for your tenant will be available here.
              </p>
            </CardContent>
          </Card>

          {/* Pricing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Settings
              </CardTitle>
              <CardDescription>
                Configure pricing and currency settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.href = '/settings?tab=currency'}
                variant="outline"
                className="w-full justify-start"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Manage Currency Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Super Admin Only Features */}
        {isSuperAdmin && (
          <div className="border-t pt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Global Administration</h2>
              <p className="text-muted-foreground">
                Super admin features for managing the entire platform
              </p>
            </div>

            <div className="space-y-6">
              {/* Global Tenant Management */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Global Tenant Management
                    </CardTitle>
                    <CardDescription>
                      Create and manage all tenants across the platform
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

              {/* Global User Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Global User Management
                  </CardTitle>
                  <CardDescription>
                    Manage user access and roles across all tenants ({filteredMemberships.length} users)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={filterTenant} onValueChange={setFilterTenant}>
                      <SelectTrigger className="w-[200px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tenants</SelectItem>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterRole} onValueChange={setFilterRole}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMemberships.map((membership) => (
                        <TableRow key={membership.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {membership.user_profile?.first_name} {membership.user_profile?.last_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{membership.user_profile?.email}</div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{membership.tenant?.name}</div>
                              <div className="text-sm text-muted-foreground">{membership.tenant?.slug}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={membership.role === 'super_admin' ? 'destructive' : membership.role === 'admin' ? 'default' : 'secondary'}>
                              {membership.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={membership.active ? 'default' : 'secondary'}>
                              {membership.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(membership.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditUserModal(membership)}
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredMemberships.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            {searchTerm || filterTenant !== 'all' || filterRole !== 'all' 
                              ? 'No users found matching your filters.' 
                              : 'No users found.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

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

        <EditUserModal
          open={showEditUser}
          onClose={() => setShowEditUser(false)}
          membership={selectedMembership}
          onSuccess={handleUserEditSuccess}
        />
      </div>
    </DashboardLayout>
  );
}