import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/integrations/supabase/client';

interface TodoType {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  active: boolean;
  sort_order: number;
}

export const TodoTypesManager = () => {
  const [todoTypes, setTodoTypes] = useState<TodoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<TodoType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: '',
    active: true,
  });
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const fetchTodoTypes = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('todo_types')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTodoTypes(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch todo types',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodoTypes();
  }, [currentTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    try {
      if (editingType) {
        // Update existing todo type
        const { error } = await supabase
          .from('todo_types')
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            icon: formData.icon || null,
            active: formData.active,
          })
          .eq('id', editingType.id);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Task type updated successfully',
        });
      } else {
        // Create new todo type
        const maxSortOrder = Math.max(...todoTypes.map(t => t.sort_order), 0);
        
        const { error } = await supabase
          .from('todo_types')
          .insert({
            tenant_id: currentTenant.id,
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            icon: formData.icon || null,
            active: formData.active,
            sort_order: maxSortOrder + 1,
          });

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Task type created successfully',
        });
      }

      // Reset form and close dialog
      setFormData({ name: '', description: '', color: '#3b82f6', icon: '', active: true });
      setEditingType(null);
      setIsDialogOpen(false);
      
      // Refresh list
      fetchTodoTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (todoType: TodoType) => {
    setEditingType(todoType);
    setFormData({
      name: todoType.name,
      description: todoType.description || '',
      color: todoType.color,
      icon: todoType.icon || '',
      active: todoType.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task type?')) return;

    try {
      const { error } = await supabase
        .from('todo_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Task type deleted successfully',
      });
      
      fetchTodoTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('todo_types')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      
      fetchTodoTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const commonTaskTypes = [
    { name: 'General Task', description: 'General task or action item', color: '#6366f1' },
    { name: 'Call', description: 'Phone call or video call', color: '#10b981' },
    { name: 'Meeting', description: 'In-person or virtual meeting', color: '#f59e0b' },
    { name: 'Email', description: 'Email communication', color: '#ef4444' },
    { name: 'Site Visit', description: 'Physical site inspection or visit', color: '#8b5cf6' },
    { name: 'Create Estimate', description: 'Prepare cost estimate or quote', color: '#06b6d4' },
    { name: 'Document Review', description: 'Review and process documents', color: '#84cc16' },
    { name: 'Payment Follow-up', description: 'Follow up on pending payments', color: '#ec4899' },
    { name: 'Client Communication', description: 'General client communication', color: '#f97316' },
  ];

  const createDefaultTypes = async () => {
    if (!currentTenant) return;

    try {
      const typesToCreate = commonTaskTypes.map((type, index) => ({
        tenant_id: currentTenant.id,
        name: type.name,
        description: type.description,
        color: type.color,
        active: true,
        sort_order: index + 1,
      }));

      const { error } = await supabase
        .from('todo_types')
        .insert(typesToCreate);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Default task types created successfully',
      });
      
      fetchTodoTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Types</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Types</CardTitle>
        <CardDescription>
          Manage the types of tasks that can be created across your platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingType(null);
                    setFormData({ name: '', description: '', color: '#3b82f6', icon: '', active: true });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingType ? 'Edit Task Type' : 'Add Task Type'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-10 h-10 rounded border"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="icon">Icon (Optional)</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="e.g., phone, email, calendar"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(active) => setFormData({ ...formData, active })}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingType ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {todoTypes.length === 0 && (
              <Button variant="outline" onClick={createDefaultTypes}>
                <Plus className="h-4 w-4 mr-2" />
                Create Default Types
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {todoTypes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No task types configured yet. 
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started quickly with our recommended task types, or create your own custom types.
                </p>
                <Button onClick={createDefaultTypes}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Default Task Types
                </Button>
              </div>
            ) : (
              todoTypes.map((todoType) => (
                <div
                  key={todoType.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/25 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: todoType.color }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{todoType.name}</div>
                        {!todoType.active && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {todoType.description && (
                        <div className="text-sm text-muted-foreground">
                          {todoType.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={todoType.active}
                      onCheckedChange={(active) => toggleActive(todoType.id, active)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(todoType)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(todoType.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};