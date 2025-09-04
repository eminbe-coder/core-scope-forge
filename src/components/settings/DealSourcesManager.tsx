import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';

const sourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sort_order: z.number().min(0),
});

type SourceFormData = z.infer<typeof sourceSchema>;

interface DealSource {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  tenant_id: string;
}

export const DealSourcesManager = () => {
  const [sources, setSources] = useState<DealSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<DealSource | null>(null);
  const { currentTenant } = useTenant();

  const form = useForm<SourceFormData>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      name: '',
      description: '',
      sort_order: 0,
    },
  });

  const loadSources = async () => {
    if (!currentTenant) return;
    
    try {
      const { data, error } = await supabase
        .from('deal_sources')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('sort_order');

      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error('Error loading deal sources:', error);
      toast.error('Failed to load deal sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, [currentTenant]);

  const onSubmit = async (data: SourceFormData) => {
    if (!currentTenant) return;

    try {
      if (editingSource) {
        const { error } = await supabase
          .from('deal_sources')
          .update(data)
          .eq('id', editingSource.id);

        if (error) throw error;
        toast.success('Deal source updated successfully');
        setIsEditModalOpen(false);
      } else {
        const { error } = await supabase
          .from('deal_sources')
          .insert([{ ...data, tenant_id: currentTenant.id }]);

        if (error) throw error;
        toast.success('Deal source created successfully');
        setIsCreateModalOpen(false);
      }

      form.reset();
      setEditingSource(null);
      loadSources();
    } catch (error) {
      console.error('Error saving deal source:', error);
      toast.error('Failed to save deal source');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deal_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Deal source deleted successfully');
      loadSources();
    } catch (error) {
      console.error('Error deleting deal source:', error);
      toast.error('Failed to delete deal source');
    }
  };

  const toggleSourceStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('deal_sources')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Deal source ${active ? 'activated' : 'deactivated'} successfully`);
      loadSources();
    } catch (error) {
      console.error('Error updating deal source status:', error);
      toast.error('Failed to update deal source status');
    }
  };

  const moveSource = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = sources.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sources.length) return;

    const updatedSources = [...sources];
    [updatedSources[currentIndex], updatedSources[newIndex]] = [updatedSources[newIndex], updatedSources[currentIndex]];

    try {
      const updates = updatedSources.map((source, index) => ({
        id: source.id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('deal_sources')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Source order updated successfully');
      loadSources();
    } catch (error) {
      console.error('Error updating source order:', error);
      toast.error('Failed to update source order');
    }
  };

  const openEditModal = (source: DealSource) => {
    setEditingSource(source);
    form.reset({
      name: source.name,
      description: source.description || '',
      sort_order: source.sort_order,
    });
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingSource(null);
    form.reset({
      name: '',
      description: '',
      sort_order: sources.length,
    });
    setIsCreateModalOpen(true);
  };

  if (loading) {
    return <div>Loading deal sources...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Deal Sources</CardTitle>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deal Source</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter source name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter source description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Source</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source, index) => (
              <TableRow key={source.id}>
                <TableCell className="font-medium">{source.name}</TableCell>
                <TableCell>{source.description || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <span>{source.sort_order}</span>
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSource(source.id, 'up')}
                        disabled={index === 0}
                        className="h-4 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveSource(source.id, 'down')}
                        disabled={index === sources.length - 1}
                        className="h-4 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Badge variant={source.active ? 'default' : 'secondary'}>
                      {source.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Switch
                      checked={source.active}
                      onCheckedChange={(checked) => toggleSourceStatus(source.id, checked)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(source)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(source.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Deal Source</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter source name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter source description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Source</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};