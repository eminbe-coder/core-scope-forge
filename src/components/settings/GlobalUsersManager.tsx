import React, { useEffect, useState } from 'react';
import { Plus, Eye, Check, X, Ban, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface GlobalUser {
  id: string;
  email: string;
  user_type: 'customer' | 'professional';
  first_name: string;
  last_name: string;
  company_name?: string;
  phone?: string;
  country?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verification_token?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

interface GlobalUserTenantRelationship {
  id: string;
  global_user_id: string;
  tenant_id: string;
  relationship_type: 'customer' | 'vendor' | 'partner';
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  global_user: GlobalUser;
  tenant: {
    id: string;
    name: string;
  };
}

const USER_STATUSES = [
  { value: 'pending', label: 'Pending', variant: 'outline' as const },
  { value: 'approved', label: 'Approved', variant: 'default' as const },
  { value: 'rejected', label: 'Rejected', variant: 'destructive' as const },
  { value: 'suspended', label: 'Suspended', variant: 'secondary' as const }
];

const RELATIONSHIP_TYPES = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'partner', label: 'Partner' }
];

export default function GlobalUsersManager() {
  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([]);
  const [relationships, setRelationships] = useState<GlobalUserTenantRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<GlobalUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { toast } = useToast();
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (activeTab === 'users') {
      loadGlobalUsers();
    } else {
      loadRelationships();
    }
  }, [activeTab, searchTerm, statusFilter, typeFilter]);

  const loadGlobalUsers = async () => {
    try {
      setLoading(true);
      let query = supabase.from('global_users').select('*');
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      if (typeFilter !== 'all') {
        query = query.eq('user_type', typeFilter);
      }
      
      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      // Map database data to our interface format
      const mappedUsers: GlobalUser[] = (data || []).map(user => ({
        ...user,
        user_type: user.user_type as GlobalUser['user_type'],
        status: user.status as GlobalUser['status']
      }));
      setGlobalUsers(mappedUsers);
    } catch (error) {
      console.error('Error loading global users:', error);
      toast({
        title: "Error",
        description: "Failed to load global users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRelationships = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('global_user_tenant_relationships')
        .select(`
          *,
          global_user:global_users(id, email, first_name, last_name, user_type, company_name),
          tenant:tenants(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      // Map database data to our interface format  
      const mappedRelationships: GlobalUserTenantRelationship[] = (data || []).map(rel => ({
        ...rel,
        relationship_type: rel.relationship_type as GlobalUserTenantRelationship['relationship_type'],
        status: rel.status as GlobalUserTenantRelationship['status'],
        global_user: {
          ...rel.global_user,
          user_type: rel.global_user.user_type as GlobalUser['user_type']
        }
      }));
      setRelationships(mappedRelationships);
    } catch (error) {
      console.error('Error loading relationships:', error);
      toast({
        title: "Error",
        description: "Failed to load user relationships",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: GlobalUser['status']) => {
    try {
      const { error } = await supabase
        .from('global_users')
        .update({ 
          status: newStatus,
          verified_at: newStatus === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `User status updated to ${newStatus}`
      });
      
      loadGlobalUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive"
      });
    }
  };

  const updateRelationshipStatus = async (relationshipId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('global_user_tenant_relationships')
        .update({ status: newStatus })
        .eq('id', relationshipId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Relationship status updated to ${newStatus}`
      });
      
      loadRelationships();
    } catch (error: any) {
      console.error('Error updating relationship status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update relationship status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = USER_STATUSES.find(s => s.value === status);
    return statusConfig ? statusConfig : { label: status, variant: 'outline' as const };
  };

  const filteredUsers = globalUsers.filter(user => {
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    if (typeFilter !== 'all' && user.user_type !== typeFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        user.first_name.toLowerCase().includes(search) ||
        user.last_name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        (user.company_name && user.company_name.toLowerCase().includes(search))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Global Users</h2>
          <p className="text-muted-foreground">
            Manage global users (customers and professionals) across the platform
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Global Users</TabsTrigger>
          <TabsTrigger value="relationships">Tenant Relationships</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global User Management</CardTitle>
              <CardDescription>
                Manage customer and professional user accounts across all tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {USER_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {user.user_type === 'customer' ? (
                              <User className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Building className="w-4 h-4 text-green-500" />
                            )}
                            <div>
                              <div className="font-medium">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.user_type === 'customer' ? 'Customer' : 'Professional'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.company_name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(user.status).variant}>
                            {getStatusBadge(user.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {user.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateUserStatus(user.id, 'approved')}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateUserStatus(user.id, 'rejected')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {user.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateUserStatus(user.id, 'suspended')}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User-Tenant Relationships</CardTitle>
              <CardDescription>
                Manage relationships between global users and tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading relationships...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Relationship Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relationships.map((relationship) => (
                      <TableRow key={relationship.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {relationship.global_user.user_type === 'customer' ? (
                              <User className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Building className="w-4 h-4 text-green-500" />
                            )}
                            <div>
                              <div className="font-medium">
                                {relationship.global_user.first_name} {relationship.global_user.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {relationship.global_user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{relationship.tenant.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {RELATIONSHIP_TYPES.find(t => t.value === relationship.relationship_type)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={relationship.status === 'active' ? 'default' : 'secondary'}>
                            {relationship.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(relationship.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {relationship.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateRelationshipStatus(relationship.id, 'suspended')}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                            {relationship.status === 'suspended' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateRelationshipStatus(relationship.id, 'active')}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View global user information and details
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-base font-medium">Full Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-base font-medium">User Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.user_type === 'customer' ? 'Customer' : 'Professional'}
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">Status</Label>
                  <Badge variant={getStatusBadge(selectedUser.status).variant} className="mt-1">
                    {getStatusBadge(selectedUser.status).label}
                  </Badge>
                </div>
                {selectedUser.company_name && (
                  <div>
                    <Label className="text-base font-medium">Company</Label>
                    <p className="text-sm text-muted-foreground">{selectedUser.company_name}</p>
                  </div>
                )}
                {selectedUser.phone && (
                  <div>
                    <Label className="text-base font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground">{selectedUser.phone}</p>
                  </div>
                )}
                {selectedUser.country && (
                  <div>
                    <Label className="text-base font-medium">Country</Label>
                    <p className="text-sm text-muted-foreground">{selectedUser.country}</p>
                  </div>
                )}
                <div>
                  <Label className="text-base font-medium">Registration Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedUser.verified_at && (
                  <div>
                    <Label className="text-base font-medium">Verified Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedUser.verified_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
                {selectedUser.status === 'pending' && (
                  <>
                    <Button 
                      onClick={() => {
                        updateUserStatus(selectedUser.id, 'approved');
                        setIsDialogOpen(false);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve User
                    </Button>
                    <Button 
                      onClick={() => {
                        updateUserStatus(selectedUser.id, 'rejected');
                        setIsDialogOpen(false);
                      }}
                      variant="destructive"
                    >
                      Reject User
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}