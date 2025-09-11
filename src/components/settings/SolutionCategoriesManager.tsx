import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface SolutionCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  created_by?: string;
}

export const SolutionCategoriesManager = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [categories, setCategories] = useState<SolutionCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SolutionCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
  });

  useEffect(() => {
    if (currentTenant) {
      fetchCategories();
    }
  }, [currentTenant]);

  const fetchCategories = async () => {
    if (!currentTenant) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solution_categories')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching solution categories:', error);
      toast.error('Failed to load solution categories');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', active: true });
    setEditingCategory(null);
  };

  const openDialog = (category?: SolutionCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        active: category.active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !user) return;

    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setLoading(true);
    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('solution_categories')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            active: formData.active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Solution category updated successfully');
      } else {
        // Create new category
        const { error } = await supabase
          .from('solution_categories')
          .insert({
            tenant_id: currentTenant.id,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            active: formData.active,
            created_by: user.id,
          });

        if (error) throw error;
        toast.success('Solution category created successfully');
      }

      await fetchCategories();
      closeDialog();
    } catch (error: any) {
      console.error('Error saving solution category:', error);
      if (error.code === '23505') {
        toast.error('A category with this name already exists');
      } else {
        toast.error('Failed to save solution category');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (category: SolutionCategory) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('solution_categories')
        .update({ 
          active: !category.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', category.id);

      if (error) throw error;
      toast.success(`Category ${!category.active ? 'activated' : 'deactivated'}`);
      await fetchCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast.error('Failed to update category status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: SolutionCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('solution_categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      toast.success('Category deleted successfully');
      await fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      if (error.code === '23503') {
        toast.error('Cannot delete category that is being used by leads, deals, or contracts');
      } else {
        toast.error('Failed to delete category');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Solution Categories
            </CardTitle>
            <CardDescription>
              Manage solution categories for leads, deals, and contracts. Categories help organize and track different types of solutions offered.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Solution Category' : 'Create Solution Category'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory 
                      ? 'Update the solution category details' 
                      : 'Create a new solution category for your tenant'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter category name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description for this category"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading && categories.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading solution categories...</div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">No solution categories found</div>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first solution category to start organizing your leads, deals, and contracts.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || 'No description'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.active ? 'default' : 'secondary'}>
                      {category.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(category.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={category.active}
                        onCheckedChange={() => handleToggleActive(category)}
                        disabled={loading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog(category)}
                        disabled={loading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};