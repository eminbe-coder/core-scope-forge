import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface DealStatus {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  requires_reason: boolean;
  is_pause_status: boolean;
}

export const DealStatusesManager = () => {
  const { currentTenant } = useTenant();
  const [dealStatuses, setDealStatuses] = useState<DealStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState<DealStatus | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    requires_reason: false,
    is_pause_status: false,
  });

  useEffect(() => {
    if (currentTenant?.id) {
      fetchDealStatuses();
    }
  }, [currentTenant]);

  const fetchDealStatuses = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_statuses')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true)
        .order('sort_order');

      if (error) throw error;
      setDealStatuses(data || []);
    } catch (error) {
      console.error('Error fetching deal statuses:', error);
      toast.error('Failed to load deal statuses');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
      requires_reason: false,
      is_pause_status: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingStatus) {
        const { error } = await supabase
          .from('deal_statuses')
          .update({
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
            requires_reason: formData.requires_reason,
            is_pause_status: formData.is_pause_status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStatus.id);

        if (error) throw error;
        toast.success('Deal status updated successfully');
      } else {
        const nextSortOrder = Math.max(...dealStatuses.map(s => s.sort_order), 0) + 1;
        
        const { error } = await supabase
          .from('deal_statuses')
          .insert({
            tenant_id: currentTenant?.id,
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
            requires_reason: formData.requires_reason,
            is_pause_status: formData.is_pause_status,
            sort_order: nextSortOrder,
          });

        if (error) throw error;
        toast.success('Deal status created successfully');
      }

      await fetchDealStatuses();
      setIsDialogOpen(false);
      setEditingStatus(null);
      resetForm();
    } catch (error) {
      console.error('Error saving deal status:', error);
      toast.error('Failed to save deal status');
    }
  };

  const handleEdit = (status: DealStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      description: status.description || '',
      is_active: status.is_active,
      requires_reason: status.requires_reason || false,
      is_pause_status: status.is_pause_status || false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (statusId: string) => {
    try {
      const { error } = await supabase
        .from('deal_statuses')
        .update({ active: false })
        .eq('id', statusId);

      if (error) throw error;
      toast.success('Deal status deleted successfully');
      await fetchDealStatuses();
    } catch (error) {
      console.error('Error deleting deal status:', error);
      toast.error('Failed to delete deal status');
    }
  };

  const toggleActive = async (statusId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('deal_statuses')
        .update({ is_active: isActive })
        .eq('id', statusId);

      if (error) throw error;
      await fetchDealStatuses();
    } catch (error) {
      console.error('Error updating deal status:', error);
      toast.error('Failed to update deal status');
    }
  };

  const openCreateDialog = () => {
    setEditingStatus(null);
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Statuses</CardTitle>
        <CardDescription>
          Manage deal statuses available in your CRM system.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deal Status
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStatus ? 'Edit Deal Status' : 'Create Deal Status'}
              </DialogTitle>
              <DialogDescription>
                {editingStatus 
                  ? 'Update the deal status details below.'
                  : 'Create a new deal status for your CRM system.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g., Active, Paused"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe this deal status..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Active Status</label>
                  <div className="text-[0.8rem] text-muted-foreground">
                    Enable this deal status for use in the system
                  </div>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Requires Reason</label>
                  <div className="text-[0.8rem] text-muted-foreground">
                    Prompt for a reason when changing to this status
                  </div>
                </div>
                <Switch
                  checked={formData.requires_reason}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_reason: checked })}
                />
              </div>
              <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Pause Status</label>
                  <div className="text-[0.8rem] text-muted-foreground">
                    Require a resume date when selecting this status
                  </div>
                </div>
                <Switch
                  checked={formData.is_pause_status}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_pause_status: checked, requires_reason: checked ? true : formData.requires_reason })}
                />
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingStatus ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          {dealStatuses.map((status) => (
            <div
              key={status.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{status.name}</span>
                    {!status.is_active && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                    )}
                    {status.requires_reason && (
                      <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-1 rounded">Requires Reason</span>
                    )}
                    {status.is_pause_status && (
                      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">Pause</span>
                    )}
                  </div>
                  {status.description && (
                    <p className="text-sm text-muted-foreground">{status.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={status.is_active}
                  onCheckedChange={(checked) => toggleActive(status.id, checked)}
                />
                <Button variant="ghost" size="sm" onClick={() => handleEdit(status)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(status.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};