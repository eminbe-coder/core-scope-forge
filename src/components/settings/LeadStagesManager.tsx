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

const stageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sort_order: z.number().min(0),
});

type StageFormData = z.infer<typeof stageSchema>;

interface LeadStage {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  tenant_id: string;
}

export const LeadStagesManager = () => {
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<LeadStage | null>(null);
  const { currentTenant } = useTenant();

  const form = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: '',
      description: '',
      sort_order: 0,
    },
  });

  const loadStages = async () => {
    if (!currentTenant) return;
    
    try {
      const { data, error } = await supabase
        .from('lead_stages')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('sort_order');

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error loading lead stages:', error);
      toast.error('Failed to load lead stages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStages();
  }, [currentTenant]);

  const onSubmit = async (data: StageFormData) => {
    if (!currentTenant) return;

    try {
      if (editingStage) {
        const { error } = await supabase
          .from('lead_stages')
          .update(data)
          .eq('id', editingStage.id);

        if (error) throw error;
        toast.success('Lead stage updated successfully');
        setIsEditModalOpen(false);
      } else {
        const { error } = await supabase
          .from('lead_stages')
          .insert([{ ...data, tenant_id: currentTenant.id }]);

        if (error) throw error;
        toast.success('Lead stage created successfully');
        setIsCreateModalOpen(false);
      }

      form.reset();
      setEditingStage(null);
      loadStages();
    } catch (error) {
      console.error('Error saving lead stage:', error);
      toast.error('Failed to save lead stage');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lead_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lead stage deleted successfully');
      loadStages();
    } catch (error) {
      console.error('Error deleting lead stage:', error);
      toast.error('Failed to delete lead stage');
    }
  };

  const toggleStageStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_stages')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Lead stage ${active ? 'activated' : 'deactivated'} successfully`);
      loadStages();
    } catch (error) {
      console.error('Error updating lead stage status:', error);
      toast.error('Failed to update lead stage status');
    }
  };

  const moveStage = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = stages.findIndex(s => s.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const updatedStages = [...stages];
    [updatedStages[currentIndex], updatedStages[newIndex]] = [updatedStages[newIndex], updatedStages[currentIndex]];

    try {
      const updates = updatedStages.map((stage, index) => ({
        id: stage.id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('lead_stages')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Stage order updated successfully');
      loadStages();
    } catch (error) {
      console.error('Error updating stage order:', error);
      toast.error('Failed to update stage order');
    }
  };

  const openEditModal = (stage: LeadStage) => {
    setEditingStage(stage);
    form.reset({
      name: stage.name,
      description: stage.description || '',
      sort_order: stage.sort_order,
    });
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingStage(null);
    form.reset({
      name: '',
      description: '',
      sort_order: stages.length,
    });
    setIsCreateModalOpen(true);
  };

  if (loading) {
    return <div>Loading lead stages...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lead Stages</CardTitle>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Lead Stage</DialogTitle>
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
                        <Input placeholder="Enter stage name" {...field} />
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
                        <Textarea placeholder="Enter stage description" {...field} />
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
                  <Button type="submit">Create Stage</Button>
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
            {stages.map((stage, index) => (
              <TableRow key={stage.id}>
                <TableCell className="font-medium">{stage.name}</TableCell>
                <TableCell>{stage.description || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <span>{stage.sort_order}</span>
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStage(stage.id, 'up')}
                        disabled={index === 0}
                        className="h-4 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStage(stage.id, 'down')}
                        disabled={index === stages.length - 1}
                        className="h-4 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Badge variant={stage.active ? 'default' : 'secondary'}>
                      {stage.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Switch
                      checked={stage.active}
                      onCheckedChange={(checked) => toggleStageStatus(stage.id, checked)}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(stage)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(stage.id)}
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
              <DialogTitle>Edit Lead Stage</DialogTitle>
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
                        <Input placeholder="Enter stage name" {...field} />
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
                        <Textarea placeholder="Enter stage description" {...field} />
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
                  <Button type="submit">Update Stage</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};