import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';
import { Target, Plus, Edit, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { format, addMonths, addQuarters, addYears, startOfMonth, startOfQuarter, startOfYear, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';
import { TargetHierarchyView } from './TargetHierarchyView';

const targetSchema = z.object({
  target_level: z.enum(['company', 'branch', 'department', 'user']),
  entity_id: z.string().optional(),
  target_type: z.enum(['leads_count', 'deals_count', 'deals_value', 'payments_value']),
  target_value: z.number().min(0, 'Target value must be positive'),
  period_type: z.enum(['monthly', 'quarterly', 'yearly']),
  period_start: z.string().min(1, 'Period start is required'),
});

type TargetFormData = z.infer<typeof targetSchema>;

type TargetRecord = {
  id: string;
  target_level: 'company' | 'branch' | 'department' | 'user';
  entity_id: string | null;
  target_type: 'leads_count' | 'deals_count' | 'deals_value' | 'payments_value';
  target_value: number;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  active: boolean;
  entity_name?: string;
};

type EntityOption = {
  id: string;
  name: string;
  type: string;
};

const TARGET_TYPE_LABELS = {
  leads_count: 'Number of New Leads',
  deals_count: 'Number of Deals Signed',
  deals_value: 'Value of New Deals',
  payments_value: 'Value of Payments Received'
};

const TARGET_LEVEL_LABELS = {
  company: 'Company',
  branch: 'Branch',
  department: 'Department', 
  user: 'User'
};

export function TargetsManager() {
  const { currentTenant } = useTenant();
  const [targets, setTargets] = useState<TargetRecord[]>([]);
  const [entities, setEntities] = useState<{
    branches: EntityOption[];
    departments: EntityOption[];
    users: EntityOption[];
  }>({
    branches: [],
    departments: [],
    users: []
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TargetRecord | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetToDelete, setTargetToDelete] = useState<TargetRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('targets');

  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetSchema),
    defaultValues: {
      target_level: 'company',
      entity_id: 'NONE',
      target_type: 'leads_count',
      target_value: 0,
      period_type: 'monthly',
      period_start: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const watchedLevel = form.watch('target_level');
  const watchedPeriodType = form.watch('period_type');
  const watchedPeriodStart = form.watch('period_start');

  const loadTargets = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('target_level')
        .order('period_start', { ascending: false });

      if (error) throw error;

      // Enrich targets with entity names
      const enrichedTargets = await Promise.all(
        (data || []).map(async (target) => {
          let entity_name = 'Company-wide';
          
          if (target.entity_id) {
            if (target.target_level === 'branch') {
              const { data: branch } = await supabase
                .from('branches')
                .select('name')
                .eq('id', target.entity_id)
                .single();
              entity_name = branch?.name || 'Unknown Branch';
            } else if (target.target_level === 'department') {
              const { data: department } = await supabase
                .from('departments')
                .select('name')
                .eq('id', target.entity_id)
                .single();
              entity_name = department?.name || 'Unknown Department';
            } else if (target.target_level === 'user') {
              const { data: user } = await supabase
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', target.entity_id)
                .single();
              entity_name = user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
            }
          }

          return {
            ...target,
            entity_name
          };
        })
      );

      setTargets(enrichedTargets);
    } catch (error) {
      console.error('Error loading targets:', error);
      toast.error('Failed to load targets');
    } finally {
      setLoading(false);
    }
  };

  const loadEntities = async () => {
    if (!currentTenant) return;

    try {
      const [branchesResult, departmentsResult, usersResult] = await Promise.all([
        supabase
          .from('branches')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name'),
        supabase
          .from('departments')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name'),
        supabase
          .from('profiles')
          .select(`
            id, first_name, last_name,
            user_tenant_memberships!inner(tenant_id, active)
          `)
          .eq('user_tenant_memberships.tenant_id', currentTenant.id)
          .eq('user_tenant_memberships.active', true)
      ]);

      setEntities({
        branches: (branchesResult.data || []).map(b => ({ id: b.id, name: b.name, type: 'branch' })),
        departments: (departmentsResult.data || []).map(d => ({ id: d.id, name: d.name, type: 'department' })),
        users: (usersResult.data || []).map(u => ({ 
          id: u.id, 
          name: `${u.first_name} ${u.last_name}`, 
          type: 'user' 
        }))
      });
    } catch (error) {
      console.error('Error loading entities:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadTargets(), loadEntities()]);
    };
    loadData();
  }, [currentTenant]);

  const calculatePeriodEnd = (startDate: string, periodType: string): string => {
    const start = new Date(startDate);
    
    switch (periodType) {
      case 'monthly':
        return format(endOfMonth(start), 'yyyy-MM-dd');
      case 'quarterly':
        return format(endOfQuarter(start), 'yyyy-MM-dd');
      case 'yearly':
        return format(endOfYear(start), 'yyyy-MM-dd');
      default:
        return startDate;
    }
  };

  const onSubmit = async (data: TargetFormData) => {
    if (!currentTenant) return;

    try {
      const period_end = calculatePeriodEnd(data.period_start, data.period_type);
      
      const payload = {
        tenant_id: currentTenant.id,
        target_level: data.target_level,
        entity_id: data.target_level === 'company' ? null : (data.entity_id === 'NONE' ? null : data.entity_id || null),
        target_type: data.target_type,
        target_value: data.target_value,
        period_type: data.period_type,
        period_start: data.period_start,
        period_end,
      };

      if (editingTarget) {
        const { error } = await supabase
          .from('targets')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTarget.id);

        if (error) throw error;
        toast.success('Target updated successfully');
      } else {
        const { error } = await supabase
          .from('targets')
          .insert([payload]);

        if (error) throw error;
        toast.success('Target created successfully');
      }

      setIsModalOpen(false);
      setEditingTarget(null);
      form.reset();
      loadTargets();
    } catch (error: any) {
      console.error('Error saving target:', error);
      if (error.code === '23505') {
        toast.error('A target with these settings already exists for this period');
      } else {
        toast.error('Failed to save target');
      }
    }
  };

  const handleEdit = (target: TargetRecord) => {
    setEditingTarget(target);
    form.reset({
      target_level: target.target_level,
      entity_id: target.entity_id || 'NONE',
      target_type: target.target_type,
      target_value: target.target_value,
      period_type: target.period_type,
      period_start: target.period_start,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!targetToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('targets')
        .update({ active: false })
        .eq('id', targetToDelete.id);

      if (error) throw error;

      toast.success('Target deleted successfully');
      setDeleteModalOpen(false);
      setTargetToDelete(null);
      loadTargets();
    } catch (error) {
      console.error('Error deleting target:', error);
      toast.error('Failed to delete target');
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateModal = () => {
    setEditingTarget(null);
    form.reset({
      target_level: 'company',
      entity_id: 'NONE',
      target_type: 'leads_count',
      target_value: 0,
      period_type: 'monthly',
      period_start: format(new Date(), 'yyyy-MM-dd'),
    });
    setIsModalOpen(true);
  };

  const getEntityOptions = () => {
    switch (watchedLevel) {
      case 'branch':
        return entities.branches;
      case 'department':
        return entities.departments;
      case 'user':
        return entities.users;
      default:
        return [];
    }
  };

  const formatTargetValue = (value: number, type: string) => {
    if (type.includes('value')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }
    return value.toString();
  };

  if (loading) {
    return <div>Loading targets...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Targets Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="targets">Manage Targets</TabsTrigger>
            <TabsTrigger value="hierarchy">Target Hierarchy</TabsTrigger>
          </TabsList>
          
          <TabsContent value="targets" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Set targets at company, branch, department, and user levels.
              </p>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateModal}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Target
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTarget ? 'Edit Target' : 'Create New Target'}
                    </DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="target_level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="company">Company</SelectItem>
                                <SelectItem value="branch">Branch</SelectItem>
                                <SelectItem value="department">Department</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {watchedLevel !== 'company' && (
                        <FormField
                          control={form.control}
                          name="entity_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select {TARGET_LEVEL_LABELS[watchedLevel]}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Select ${TARGET_LEVEL_LABELS[watchedLevel].toLowerCase()}`} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="NONE">No {TARGET_LEVEL_LABELS[watchedLevel].toLowerCase()} assigned</SelectItem>
                                  {getEntityOptions().map((entity) => (
                                    <SelectItem key={entity.id} value={entity.id}>
                                      {entity.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <FormField
                        control={form.control}
                        name="target_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="target_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Value</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="period_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="period_start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Period Start</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {watchedPeriodStart && (
                        <div className="text-sm text-muted-foreground">
                          Period ends: {format(new Date(calculatePeriodEnd(watchedPeriodStart, watchedPeriodType)), 'MMM dd, yyyy')}
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingTarget ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {targets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No targets found. Create your first target to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Target Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((target) => (
                    <TableRow key={target.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {TARGET_LEVEL_LABELS[target.target_level]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {target.entity_name}
                      </TableCell>
                      <TableCell>
                        {TARGET_TYPE_LABELS[target.target_type]}
                      </TableCell>
                      <TableCell>
                        {formatTargetValue(target.target_value, target.target_type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">
                            {format(new Date(target.period_start), 'MMM dd')} - {format(new Date(target.period_end), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <Badge variant="secondary" className="mt-1">
                          {target.period_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(target)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTargetToDelete(target);
                              setDeleteModalOpen(true);
                            }}
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
          </TabsContent>

          <TabsContent value="hierarchy">
            <TargetHierarchyView targets={targets} />
          </TabsContent>
        </Tabs>

        <DeleteConfirmationModal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Target"
          description={`Are you sure you want to delete this target? This action cannot be undone.`}
          isDeleting={isDeleting}
        />
      </CardContent>
    </Card>
  );
}