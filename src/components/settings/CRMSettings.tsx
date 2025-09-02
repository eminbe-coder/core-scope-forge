import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
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
import { CompanyIndustriesManager } from './CompanyIndustriesManager';
import { CompanyTypesManager } from './CompanyTypesManager';
import { TaskTypesSettings } from './TaskTypesSettings';
import { RelationshipRolesSettings } from './RelationshipRolesSettings';
import { BranchesManager } from './BranchesManager';
import { DepartmentsManager } from './DepartmentsManager';
import { TargetsManager } from './TargetsManager';
import { CommissionSettings } from './CommissionSettings';

const stageSchema = z.object({
  name: z.string().min(1, 'Stage name is required'),
  description: z.string().optional(),
  win_percentage: z.number().min(0).max(100),
  sort_order: z.number().min(0),
});

type StageFormData = z.infer<typeof stageSchema>;

interface DealStage {
  id: string;
  name: string;
  description?: string;
  win_percentage: number;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function CRMSettings() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<DealStage | null>(null);

  const form = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: '',
      description: '',
      win_percentage: 0,
      sort_order: 0,
    },
  });

  useEffect(() => {
    if (currentTenant) {
      loadStages();
    }
  }, [currentTenant]);

  const loadStages = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_stages')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('sort_order');

      if (error) throw error;
      setStages(data || []);
    } catch (error: any) {
      console.error('Error loading stages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load deal stages',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: StageFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      if (selectedStage) {
        // Update existing stage
        const { error } = await supabase
          .from('deal_stages')
          .update({
            name: data.name,
            description: data.description || null,
            win_percentage: data.win_percentage,
            sort_order: data.sort_order,
          })
          .eq('id', selectedStage.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Deal stage updated successfully',
        });
      } else {
        // Create new stage
        const { error } = await supabase
          .from('deal_stages')
          .insert({
            name: data.name,
            description: data.description || null,
            win_percentage: data.win_percentage,
            sort_order: data.sort_order,
            tenant_id: currentTenant.id,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Deal stage created successfully',
        });
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedStage(null);
      form.reset();
      loadStages();
    } catch (error: any) {
      console.error('Error saving stage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save deal stage',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (stageId: string) => {
    try {
      const { error } = await supabase
        .from('deal_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Deal stage deleted successfully',
      });

      loadStages();
    } catch (error: any) {
      console.error('Error deleting stage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete deal stage',
        variant: 'destructive',
      });
    }
  };

  const toggleStageStatus = async (stageId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('deal_stages')
        .update({ active: !currentStatus })
        .eq('id', stageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Deal stage ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      loadStages();
    } catch (error: any) {
      console.error('Error updating stage status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update stage status',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (stage: DealStage) => {
    setSelectedStage(stage);
    form.reset({
      name: stage.name,
      description: stage.description || '',
      win_percentage: stage.win_percentage,
      sort_order: stage.sort_order,
    });
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setSelectedStage(null);
    form.reset({
      name: '',
      description: '',
      win_percentage: 0,
      sort_order: stages.length,
    });
    setShowCreateModal(true);
  };

  const StageForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stage Name *</FormLabel>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="win_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Win Percentage *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
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
                <FormLabel>Sort Order *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedStage(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {selectedStage ? 'Update Stage' : 'Create Stage'}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6">
        <Tabs defaultValue="stages" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="stages">Deal Stages</TabsTrigger>
            <TabsTrigger value="targets">Targets</TabsTrigger>
            <TabsTrigger value="commission">Commission</TabsTrigger>
            <TabsTrigger value="industries">Company Industries</TabsTrigger>
            <TabsTrigger value="types">Company Types</TabsTrigger>
            <TabsTrigger value="tasks">Task Types</TabsTrigger>
            <TabsTrigger value="relationships">Relationship Roles</TabsTrigger>
          </TabsList>
        
        <TabsContent value="stages" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Deal Stages</CardTitle>
                <CardDescription>
                  Manage deal stages and their winning percentages
                </CardDescription>
              </div>
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Deal Stage</DialogTitle>
                    <DialogDescription>
                      Add a new stage to your deal pipeline
                    </DialogDescription>
                  </DialogHeader>
                  <StageForm />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Win %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stages.map((stage) => (
                    <TableRow key={stage.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <GripVertical className="h-4 w-4 text-muted-foreground mr-2" />
                          {stage.sort_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{stage.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {stage.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {stage.win_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={stage.active}
                            onCheckedChange={() => toggleStageStatus(stage.id, stage.active)}
                          />
                          <span className="text-sm">
                            {stage.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
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
                  {stages.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-muted-foreground">
                          No deal stages configured. Create your first stage to get started.
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit Modal */}
          <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Deal Stage</DialogTitle>
                <DialogDescription>
                  Update the deal stage configuration
                </DialogDescription>
              </DialogHeader>
              <StageForm />
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="targets">
          <TargetsManager />
        </TabsContent>

        <TabsContent value="commission">
          <CommissionSettings />
        </TabsContent>

        <TabsContent value="industries">
          <CompanyIndustriesManager />
        </TabsContent>

        <TabsContent value="types">
          <CompanyTypesManager />
        </TabsContent>

        <TabsContent value="tasks">
          <TaskTypesSettings />
        </TabsContent>

        <TabsContent value="relationships">
          <RelationshipRolesSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}