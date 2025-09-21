import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Building2, Plus, Edit, Trash2, Shield, Smartphone, Settings } from 'lucide-react';
import { CreateTenantForm } from '@/components/forms/CreateTenantForm';
import { TenantEditModal } from '@/components/modals/TenantEditModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditUserModal } from '@/components/forms/EditUserModal';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeviceTypesManager } from '@/components/settings/DeviceTypesManager';
import { AdvancedDeviceTemplatesManager } from '@/components/settings/AdvancedDeviceTemplatesManager';
import { BrandManager } from '@/components/settings/BrandManager';
import GlobalUsersManager from '@/components/settings/GlobalUsersManager';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface TenantMembership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  tenant: any;
  user_profile: any;
}

interface Tenant {
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
  contact_phone_country_code?: string;
  contact_phone_number?: string;
  default_currency_id?: string;
  created_at: string;
  updated_at: string;
}

const CorePlatform = () => {
  const navigate = useNavigate();
  const { hasGlobalAccess } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [allMemberships, setAllMemberships] = useState<TenantMembership[]>([]);
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<TenantMembership | null>(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showEditTenant, setShowEditTenant] = useState(false);

  useEffect(() => {
    if (hasGlobalAccess) {
      fetchAllData();
    }
  }, [hasGlobalAccess]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all tenant memberships
      const { data: memberships, error: membershipsError } = await supabase
        .rpc('get_all_tenant_memberships_for_super_admin');
      
      if (membershipsError) throw membershipsError;
      
      // Fetch all tenants
      const { data: tenants, error: tenantsError } = await supabase
        .rpc('get_all_tenants_for_super_admin');
      
      if (tenantsError) throw tenantsError;
      
      setAllMemberships(memberships || []);
      setAllTenants(tenants || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMemberships = allMemberships.filter(membership => {
    const matchesSearch = 
      membership.user_profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      membership.user_profile.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      membership.user_profile.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      membership.tenant.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTenant = selectedTenant === 'all' || membership.tenant_id === selectedTenant;
    const matchesRole = selectedRole === 'all' || membership.role === selectedRole;
    
    return matchesSearch && matchesTenant && matchesRole;
  });

  const uniqueTenants = Array.from(
    new Set(allMemberships.map(m => m.tenant_id))
  ).map(tenantId => 
    allMemberships.find(m => m.tenant_id === tenantId)?.tenant
  ).filter(Boolean);

  const uniqueRoles = Array.from(
    new Set(allMemberships.map(m => m.role))
  );

  if (!hasGlobalAccess) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You need global access privileges to use the Core Platform.
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Core Platform
          </h1>
          <p className="text-muted-foreground">
            Global system administration, templates, and tenant management
          </p>
        </div>

        <Tabs defaultValue="tenants" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="tenants">Tenants</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="global-users">Global Users</TabsTrigger>
              <TabsTrigger value="brands">Brands</TabsTrigger>
              <TabsTrigger value="device-templates">Device Templates</TabsTrigger>
              <TabsTrigger value="system-settings">System Settings</TabsTrigger>
            </TabsList>

          <TabsContent value="tenants" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Tenant Organizations
                    </CardTitle>
                    <CardDescription>
                      Manage all tenant organizations in the system
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateTenant(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tenant
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : allTenants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No tenants found
                          </TableCell>
                        </TableRow>
                      ) : (
                        allTenants.map((tenant) => (
                          <TableRow key={tenant.id}>
                            <TableCell className="font-medium">{tenant.name}</TableCell>
                            <TableCell>{tenant.slug}</TableCell>
                            <TableCell>{tenant.domain || '-'}</TableCell>
                            <TableCell>{tenant.company_location || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={tenant.active ? 'default' : 'secondary'}>
                                {tenant.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingTenant(tenant);
                                  setShowEditTenant(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
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
                      Manage user memberships across all tenant organizations
                    </CardDescription>
                  </div>
                  <Button onClick={() => setEditingUser({} as TenantMembership)}>
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
                    value={selectedTenant}
                    onChange={(e) => setSelectedTenant(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md"
                  >
                    <option value="all">All Tenants</option>
                    {uniqueTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
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
                        <TableHead>Tenant</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredMemberships.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMemberships.map((membership) => (
                          <TableRow key={membership.id}>
                            <TableCell>
                              {membership.user_profile.first_name} {membership.user_profile.last_name}
                            </TableCell>
                            <TableCell>{membership.user_profile.email}</TableCell>
                            <TableCell>{membership.tenant.name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={membership.role === 'super_admin' ? 'destructive' : 
                                       membership.role === 'admin' ? 'default' : 'secondary'}
                              >
                                {membership.role.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={membership.active ? 'default' : 'secondary'}>
                                {membership.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingUser(membership)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
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

          <TabsContent value="global-users" className="space-y-6">
            <GlobalUsersManager />
          </TabsContent>

          <TabsContent value="brands" className="space-y-6">
            <BrandManager />
          </TabsContent>

          <TabsContent value="device-templates" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Device Templates</h2>
                <p className="text-muted-foreground">Manage global and tenant-specific device templates</p>
              </div>
              <Button onClick={() => navigate('/device-templates/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </div>
            <div className="space-y-6">
              <DeviceTypesManager />
              <AdvancedDeviceTemplatesManager />
            </div>
          </TabsContent>

          <TabsContent value="system-settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Settings
                </CardTitle>
                <CardDescription>
                  Configure global system settings and defaults
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    System-wide configuration options will be available here.
                  </p>
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
              fetchAllData();
            }}
          />
        )}

        <TenantEditModal
          tenant={editingTenant}
          open={showEditTenant}
          onOpenChange={setShowEditTenant}
          onSuccess={fetchAllData}
        />

        {showCreateTenant && (
          <Dialog open={showCreateTenant} onOpenChange={setShowCreateTenant}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
                <DialogDescription>
                  Add a new tenant organization to the system.
                </DialogDescription>
              </DialogHeader>
              <CreateTenantForm
                onSuccess={() => {
                  setShowCreateTenant(false);
                  fetchAllData();
                }}
                onCancel={() => setShowCreateTenant(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CorePlatform;