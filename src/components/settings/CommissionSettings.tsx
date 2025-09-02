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
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GripVertical, Target, DollarSign } from 'lucide-react';
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

const commissionSchema = z.object({
  name: z.string().min(1, 'Configuration name is required'),
  description: z.string().optional(),
  earning_rules: z.array(z.string()).min(1, 'At least one earning rule must be selected'),
  calculation_method: z.enum(['fixed', 'percentage', 'stage_based']),
  fixed_amount: z.number().optional(),
  percentage_rate: z.number().min(0).max(100).optional(),
}).refine((data) => {
  if (data.calculation_method === 'fixed' && !data.fixed_amount) {
    return false;
  }
  if (data.calculation_method === 'percentage' && !data.percentage_rate) {
    return false;
  }
  return true;
}, {
  message: 'Amount/percentage is required for the selected calculation method',
  path: ['fixed_amount'],
});

const stageSchema = z.object({
  stage_name: z.string().min(1, 'Stage name is required'),
  min_threshold: z.number().min(0),
  max_threshold: z.number().optional(),
  threshold_type: z.enum(['percentage', 'fixed']),
  commission_rate: z.number().min(0).max(100),
});

type CommissionFormData = z.infer<typeof commissionSchema>;
type StageFormData = z.infer<typeof stageSchema>;

interface CommissionConfiguration {
  id: string;
  name: string;
  description?: string;
  earning_rules: any; // Will be JSON from database
  calculation_method: string; // Will be validated on use
  fixed_amount?: number;
  percentage_rate?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface CommissionStage {
  id: string;
  commission_configuration_id: string;
  stage_name: string;
  min_threshold: number;
  max_threshold?: number;
  threshold_type: string; // Will be validated on use
  commission_rate: number;
  sort_order: number;
}

const EARNING_RULES = [
  { value: 'payment_received', label: 'Per payment received' },
  { value: 'personal_target', label: 'On achieving personal target' },
  { value: 'department_target', label: 'On achieving department target' },
  { value: 'branch_target', label: 'On achieving branch target' },
  { value: 'company_target', label: 'On achieving company target' },
];

export function CommissionSettings() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [configurations, setConfigurations] = useState<CommissionConfiguration[]>([]);
  const [stages, setStages] = useState<CommissionStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<CommissionConfiguration | null>(null);
  const [selectedConfigForStages, setSelectedConfigForStages] = useState<string | null>(null);

  const form = useForm<CommissionFormData>({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      name: '',
      description: '',
      earning_rules: [],
      calculation_method: 'fixed',
      fixed_amount: 0,
      percentage_rate: 0,
    },
  });

  const stageForm = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      stage_name: '',
      min_threshold: 0,
      max_threshold: undefined,
      threshold_type: 'percentage',
      commission_rate: 0,
    },
  });

  useEffect(() => {
    if (currentTenant) {
      loadConfigurations();
    }
  }, [currentTenant]);

  const loadConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_configurations')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigurations(data || []);
    } catch (error: any) {
      console.error('Error loading configurations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load commission configurations',
        variant: 'destructive',
      });
    }
  };

  const loadStages = async (configId: string) => {
    try {
      const { data, error } = await supabase
        .from('commission_stages')
        .select('*')
        .eq('commission_configuration_id', configId)
        .order('sort_order');

      if (error) throw error;
      setStages(data || []);
    } catch (error: any) {
      console.error('Error loading stages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load commission stages',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: CommissionFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      if (selectedConfig) {
        // Update existing configuration
        const { error } = await supabase
          .from('commission_configurations')
          .update({
            name: data.name,
            description: data.description || null,
            earning_rules: data.earning_rules,
            calculation_method: data.calculation_method,
            fixed_amount: data.fixed_amount || null,
            percentage_rate: data.percentage_rate || null,
          })
          .eq('id', selectedConfig.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Commission configuration updated successfully',
        });
      } else {
        // Create new configuration
        const { error } = await supabase
          .from('commission_configurations')
          .insert({
            name: data.name,
            description: data.description || null,
            earning_rules: data.earning_rules,
            calculation_method: data.calculation_method,
            fixed_amount: data.fixed_amount || null,
            percentage_rate: data.percentage_rate || null,
            tenant_id: currentTenant.id,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Commission configuration created successfully',
        });
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedConfig(null);
      form.reset();
      loadConfigurations();
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save commission configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onStageSubmit = async (data: StageFormData) => {
    if (!currentTenant || !selectedConfigForStages) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('commission_stages')
        .insert({
          commission_configuration_id: selectedConfigForStages,
          tenant_id: currentTenant.id,
          stage_name: data.stage_name,
          min_threshold: data.min_threshold,
          max_threshold: data.max_threshold || null,
          threshold_type: data.threshold_type,
          commission_rate: data.commission_rate,
          sort_order: stages.length,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Commission stage added successfully',
      });

      setShowStageModal(false);
      stageForm.reset();
      loadStages(selectedConfigForStages);
    } catch (error: any) {
      console.error('Error saving stage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save commission stage',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    try {
      const { error } = await supabase
        .from('commission_configurations')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Commission configuration deleted successfully',
      });

      loadConfigurations();
    } catch (error: any) {
      console.error('Error deleting configuration:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete commission configuration',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      const { error } = await supabase
        .from('commission_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Commission stage deleted successfully',
      });

      if (selectedConfigForStages) {
        loadStages(selectedConfigForStages);
      }
    } catch (error: any) {
      console.error('Error deleting stage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete commission stage',
        variant: 'destructive',
      });
    }
  };

  const toggleConfigStatus = async (configId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('commission_configurations')
        .update({ active: !currentStatus })
        .eq('id', configId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Commission configuration ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      loadConfigurations();
    } catch (error: any) {
      console.error('Error updating configuration status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update configuration status',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (config: CommissionConfiguration) => {
    setSelectedConfig(config);
    form.reset({
      name: config.name,
      description: config.description || '',
      earning_rules: Array.isArray(config.earning_rules) ? config.earning_rules : [],
      calculation_method: config.calculation_method as 'fixed' | 'percentage' | 'stage_based',
      fixed_amount: config.fixed_amount || 0,
      percentage_rate: config.percentage_rate || 0,
    });
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setSelectedConfig(null);
    form.reset({
      name: '',
      description: '',
      earning_rules: [],
      calculation_method: 'fixed',
      fixed_amount: 0,
      percentage_rate: 0,
    });
    setShowCreateModal(true);
  };

  const openStageModal = (configId: string) => {
    setSelectedConfigForStages(configId);
    loadStages(configId);
    stageForm.reset();
    setShowStageModal(true);
  };

  const CommissionForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Configuration Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter configuration name" {...field} />
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
                <Textarea placeholder="Enter description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="earning_rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Earning Rules * (Select one or more)</FormLabel>
              <div className="space-y-2">
                {EARNING_RULES.map((rule) => (
                  <div key={rule.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={rule.value}
                      checked={field.value.includes(rule.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...field.value, rule.value]);
                        } else {
                          field.onChange(field.value.filter((v: string) => v !== rule.value));
                        }
                      }}
                    />
                    <Label htmlFor={rule.value}>{rule.label}</Label>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="calculation_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calculation Method *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select calculation method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage of Value</SelectItem>
                  <SelectItem value="stage_based">Stage-based Brackets</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('calculation_method') === 'fixed' && (
          <FormField
            control={form.control}
            name="fixed_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fixed Amount *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter fixed amount"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {form.watch('calculation_method') === 'percentage' && (
          <FormField
            control={form.control}
            name="percentage_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Percentage Rate * (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Enter percentage"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedConfig(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {selectedConfig ? 'Update Configuration' : 'Create Configuration'}
          </Button>
        </div>
      </form>
    </Form>
  );

  const StageForm = () => (
    <div className="space-y-4">
      <div className="max-h-60 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stage Name</TableHead>
              <TableHead>Threshold Range</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Commission %</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map((stage) => (
              <TableRow key={stage.id}>
                <TableCell>{stage.stage_name}</TableCell>
                <TableCell>
                  {stage.min_threshold}
                  {stage.max_threshold ? ` - ${stage.max_threshold}` : '+'}
                </TableCell>
                <TableCell>
                  <Badge variant={stage.threshold_type === 'percentage' ? 'default' : 'secondary'}>
                    {stage.threshold_type === 'percentage' ? 'Percentage' : 'Fixed'}
                  </Badge>
                </TableCell>
                <TableCell>{stage.commission_rate}%</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteStage(stage.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Form {...stageForm}>
        <form onSubmit={stageForm.handleSubmit(onStageSubmit)} className="space-y-4">
          <FormField
            control={stageForm.control}
            name="stage_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stage Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Below Target, Target Met" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={stageForm.control}
              name="min_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Threshold *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={stageForm.control}
              name="max_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Threshold (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Leave empty for no upper limit"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={stageForm.control}
              name="threshold_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Threshold Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage of Target</SelectItem>
                      <SelectItem value="fixed">Fixed Numbers</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={stageForm.control}
              name="commission_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Rate * (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowStageModal(false);
                setSelectedConfigForStages(null);
              }}
            >
              Close
            </Button>
            <Button type="submit" disabled={loading}>
              Add Stage
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Commission Configurations</CardTitle>
            <CardDescription>
              Manage commission earning rules and calculation methods
            </CardDescription>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Commission Configuration</DialogTitle>
                <DialogDescription>
                  Set up earning rules and calculation methods for commissions
                </DialogDescription>
              </DialogHeader>
              <CommissionForm />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Earning Rules</TableHead>
                <TableHead>Calculation Method</TableHead>
                <TableHead>Rate/Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configurations.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{config.name}</div>
                      {config.description && (
                        <div className="text-sm text-muted-foreground">
                          {config.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {config.earning_rules.map((rule) => (
                        <Badge key={rule} variant="outline" className="text-xs">
                          {EARNING_RULES.find(r => r.value === rule)?.label || rule}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      config.calculation_method === 'fixed' ? 'default' :
                      config.calculation_method === 'percentage' ? 'secondary' : 'outline'
                    }>
                      {config.calculation_method === 'fixed' && 'Fixed Amount'}
                      {config.calculation_method === 'percentage' && 'Percentage'}
                      {config.calculation_method === 'stage_based' && 'Stage-based'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {config.calculation_method === 'fixed' && config.fixed_amount && (
                      <span>${config.fixed_amount}</span>
                    )}
                    {config.calculation_method === 'percentage' && config.percentage_rate && (
                      <span>{config.percentage_rate}%</span>
                    )}
                    {config.calculation_method === 'stage_based' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStageModal(config.id)}
                      >
                        <Target className="h-4 w-4 mr-1" />
                        Manage Stages
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.active}
                        onCheckedChange={() => toggleConfigStatus(config.id, config.active)}
                      />
                      <span className="text-sm">
                        {config.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {configurations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      No commission configurations found. Create your first configuration to get started.
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Commission Configuration</DialogTitle>
            <DialogDescription>
              Update the commission configuration settings
            </DialogDescription>
          </DialogHeader>
          <CommissionForm />
        </DialogContent>
      </Dialog>

      {/* Stage Management Modal */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Commission Stages</DialogTitle>
            <DialogDescription>
              Configure stage-based commission brackets and rates
            </DialogDescription>
          </DialogHeader>
          <StageForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}