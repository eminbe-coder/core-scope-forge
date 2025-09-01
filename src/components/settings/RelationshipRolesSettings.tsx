import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface RelationshipRole {
  id: string;
  name: string;
  description: string | null;
  category: string;
  active: boolean;
}

const categories = [
  { value: 'general', label: 'General' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'design', label: 'Design' },
  { value: 'client', label: 'Client' },
];

export function RelationshipRolesSettings() {
  const { currentTenant } = useTenant();
  const [roles, setRoles] = useState<RelationshipRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RelationshipRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
  });

  useEffect(() => {
    if (currentTenant?.id) {
      fetchRoles();
    }
  }, [currentTenant?.id]);

  const fetchRoles = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('relationship_roles')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching relationship roles:', error);
      toast.error('Failed to load relationship roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id || !formData.name.trim()) return;

    try {
      if (editingRole) {
        const { error } = await supabase
          .from('relationship_roles')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            category: formData.category,
          })
          .eq('id', editingRole.id);

        if (error) throw error;
        toast.success('Relationship role updated successfully');
      } else {
        const { error } = await supabase
          .from('relationship_roles')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            category: formData.category,
            tenant_id: currentTenant.id,
          });

        if (error) throw error;
        toast.success('Relationship role created successfully');
      }

      fetchRoles();
      resetForm();
    } catch (error) {
      console.error('Error saving relationship role:', error);
      toast.error('Failed to save relationship role');
    }
  };

  const handleEdit = (role: RelationshipRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      category: role.category,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this relationship role? This will remove all associated relationships.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('relationship_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
      toast.success('Relationship role deleted successfully');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting relationship role:', error);
      toast.error('Failed to delete relationship role');
    }
  };

  const toggleActive = async (role: RelationshipRole) => {
    try {
      const { error } = await supabase
        .from('relationship_roles')
        .update({ active: !role.active })
        .eq('id', role.id);

      if (error) throw error;
      toast.success(`Role ${role.active ? 'deactivated' : 'activated'} successfully`);
      fetchRoles();
    } catch (error) {
      console.error('Error updating role status:', error);
      toast.error('Failed to update role status');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', category: 'general' });
    setEditingRole(null);
    setIsDialogOpen(false);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'default',
      contractor: 'secondary',
      consultant: 'outline',
      design: 'default',
      client: 'secondary',
    };
    return colors[category as keyof typeof colors] || 'default';
  };

  if (loading) {
    return <div>Loading relationship roles...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Relationship Roles</CardTitle>
            <CardDescription>
              Manage relationship roles used to link companies and contacts to deals, sites, and leads
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRole ? 'Edit Relationship Role' : 'Add Relationship Role'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Contractor"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description of this role"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRole ? 'Update Role' : 'Create Role'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>
                  <Badge variant={getCategoryColor(role.category) as any}>
                    {categories.find(c => c.value === role.category)?.label || role.category}
                  </Badge>
                </TableCell>
                <TableCell>{role.description || '-'}</TableCell>
                <TableCell>
                  <Badge variant={role.active ? 'default' : 'secondary'}>
                    {role.active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(role)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(role)}
                    >
                      {role.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(role.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {roles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No relationship roles configured. Click "Add Role" to create your first role.
          </div>
        )}
      </CardContent>
    </Card>
  );
}