import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/integrations/supabase/client';

interface TaskType {
  id: string;
  name: string;
  description: string | null;
  color: string;
  active: boolean;
  sort_order: number;
}

export const TaskTypesSettings = () => {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<TaskType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    active: true,
  });
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const fetchTaskTypes = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('task_types')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTaskTypes(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch task types',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskTypes();
  }, [currentTenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    try {
      if (editingType) {
        // Update existing task type
        const { error } = await supabase
          .from('task_types')
          .update({
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
            active: formData.active,
          })
          .eq('id', editingType.id);

        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Task type updated successfully',
        });
      } else {
        // Create new task type
        const maxSortOrder = Math.max(...taskTypes.map(t => t.sort_order), 0);
        
        const { error } = await supabase
          .from('task_types')
          .insert({
            tenant_id: currentTenant.id,
            name: formData.name,
            description: formData.description || null,
            color: formData.color,
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
      setFormData({ name: '', description: '', color: '#3b82f6', active: true });
      setEditingType(null);
      setIsDialogOpen(false);
      
      // Refresh list
      fetchTaskTypes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (taskType: TaskType) => {
    setEditingType(taskType);
    setFormData({
      name: taskType.name,
      description: taskType.description || '',
      color: taskType.color,
      active: taskType.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task type?')) return;

    try {
      const { error } = await supabase
        .from('task_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Task type deleted successfully',
      });
      
      fetchTaskTypes();
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
        .from('task_types')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      
      fetchTaskTypes();
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingType(null);
                  setFormData({ name: '', description: '', color: '#3b82f6', active: true });
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

          <div className="space-y-2">
            {taskTypes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No task types configured yet. Add your first one above.
              </p>
            ) : (
              taskTypes.map((taskType) => (
                <div
                  key={taskType.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: taskType.color }}
                    />
                    <div>
                      <div className="font-medium">{taskType.name}</div>
                      {taskType.description && (
                        <div className="text-sm text-muted-foreground">
                          {taskType.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={taskType.active}
                      onCheckedChange={(active) => toggleActive(taskType.id, active)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(taskType)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(taskType.id)}
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