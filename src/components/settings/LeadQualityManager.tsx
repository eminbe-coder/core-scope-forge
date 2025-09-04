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

const qualitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sort_order: z.number().min(0),
});

type QualityFormData = z.infer<typeof qualitySchema>;

interface LeadQuality {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  tenant_id: string;
}

export const LeadQualityManager = () => {
  const [qualities, setQualities] = useState<LeadQuality[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuality, setEditingQuality] = useState<LeadQuality | null>(null);
  const { currentTenant } = useTenant();

  const form = useForm<QualityFormData>({
    resolver: zodResolver(qualitySchema),
    defaultValues: {
      name: '',
      description: '',
      sort_order: 0,
    },
  });

  const loadQualities = async () => {
    if (!currentTenant) return;
    
    try {
      const { data, error } = await supabase
        .from('lead_quality')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('sort_order');

      if (error) throw error;
      setQualities(data || []);
    } catch (error) {
      console.error('Error loading lead qualities:', error);
      toast.error('Failed to load lead qualities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQualities();
  }, [currentTenant]);

  const onSubmit = async (data: QualityFormData) => {
    if (!currentTenant) return;

    try {
      if (editingQuality) {
        const { error } = await supabase
          .from('lead_quality')
          .update(data)
          .eq('id', editingQuality.id);

        if (error) throw error;
        toast.success('Lead quality updated successfully');
        setIsEditModalOpen(false);
      } else {
        const { error } = await supabase
          .from('lead_quality')
          .insert([{ ...data, tenant_id: currentTenant.id }]);

        if (error) throw error;
        toast.success('Lead quality created successfully');
        setIsCreateModalOpen(false);
      }

      form.reset();
      setEditingQuality(null);
      loadQualities();
    } catch (error) {
      console.error('Error saving lead quality:', error);
      toast.error('Failed to save lead quality');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lead_quality')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lead quality deleted successfully');
      loadQualities();
    } catch (error) {
      console.error('Error deleting lead quality:', error);
      toast.error('Failed to delete lead quality');
    }
  };

  const toggleQualityStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_quality')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Lead quality ${active ? 'activated' : 'deactivated'} successfully`);
      loadQualities();
    } catch (error) {
      console.error('Error updating lead quality status:', error);
      toast.error('Failed to update lead quality status');
    }
  };

  const moveQuality = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = qualities.findIndex(q => q.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= qualities.length) return;

    const updatedQualities = [...qualities];
    [updatedQualities[currentIndex], updatedQualities[newIndex]] = [updatedQualities[newIndex], updatedQualities[currentIndex]];

    try {
      const updates = updatedQualities.map((quality, index) => ({
        id: quality.id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('lead_quality')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Quality order updated successfully');
      loadQualities();
    } catch (error) {
      console.error('Error updating quality order:', error);
      toast.error('Failed to update quality order');
    }
  };

  const openEditModal = (quality: LeadQuality) => {
    setEditingQuality(quality);
    form.reset({
      name: quality.name,
      description: quality.description || '',
      sort_order: quality.sort_order,
    });
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingQuality(null);
    form.reset({
      name: '',
      description: '',
      sort_order: qualities.length,
    });
    setIsCreateModalOpen(true);
  };

  if (loading) {
    return <div>Loading lead qualities...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lead Quality</CardTitle>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Quality
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Lead Quality</DialogTitle>
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
                        <Input placeholder="Enter quality name" {...field} />
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
                        <Textarea placeholder="Enter quality description" {...field} />
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
                  <Button type="submit">Create Quality</Button>
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
            {qualities.map((quality, index) => (
              <TableRow key={quality.id}>
                <TableCell className="font-medium">{quality.name}</TableCell>
                <TableCell>{quality.description || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <span>{quality.sort_order}</span>
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveQuality(quality.id, 'up')}
                        disabled={index === 0}
                        className="h-4 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveQuality(quality.id, 'down')}
                        disabled={index === qualities.length - 1}
                        className="h-4 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Badge variant={quality.active ? 'default' : 'secondary'}>
                      {quality.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Switch
                      checked={quality.active}
                      onCheckedChange={(checked) => toggleQualityStatus(quality.id, checked)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(quality)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(quality.id)}
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
              <DialogTitle>Edit Lead Quality</DialogTitle>
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
                        <Input placeholder="Enter quality name" {...field} />
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
                        <Textarea placeholder="Enter quality description" {...field} />
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
                  <Button type="submit">Update Quality</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};