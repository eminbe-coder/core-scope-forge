import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';

interface PaymentTerm {
  id: string;
  contract_id: string;
  installment_number: number;
  name?: string;
  amount_type: string;
  amount_value: number;
  calculated_amount: number;
  due_date?: string;
  stage_id?: string;
  notes?: string;
  contract_payment_stages?: {
    name: string;
    sort_order: number;
  } | null;
}

interface EditPaymentFormProps {
  payment: PaymentTerm;
  contractId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EditPaymentForm = ({ payment, contractId, onSuccess, onCancel }: EditPaymentFormProps) => {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [paymentStages, setPaymentStages] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: payment.name || `Payment ${payment.installment_number}`,
    amount_type: payment.amount_type,
    amount_value: payment.amount_value,
    due_date: payment.due_date || '',
    notes: payment.notes || ''
  });

  const getAutomaticStage = async (dueDate: string | null) => {
    try {
      // Get payment stages
      const { data: stages } = await supabase
        .from('contract_payment_stages')
        .select('*')
        .eq('tenant_id', currentTenant?.id);

      if (!stages) return null;

      // Get todos for this payment
      const { data: todos } = await supabase
        .from('todos')
        .select('*')
        .eq('entity_type', 'contract')
        .eq('payment_term_id', payment.id);

      const paymentTodos = todos || [];
      const incompleteTodos = paymentTodos.filter(todo => todo.status !== 'completed');
      
      const today = new Date().toISOString().split('T')[0];
      const isDueDatePassed = dueDate && dueDate <= today;

      // Determine stage based on rules
      if (incompleteTodos.length === 0 && isDueDatePassed) {
        return stages.find(stage => stage.name === 'Due')?.id || null;
      } else {
        return stages.find(stage => stage.name === 'Pending' || stage.name === 'Pending Task')?.id || null;
      }
    } catch (error) {
      console.error('Error determining automatic stage:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get automatic stage based on current rules
      const automaticStageId = await getAutomaticStage(formData.due_date || null);
      
      const updates = {
        name: formData.name,
        amount_type: formData.amount_type,
        amount_value: parseFloat(formData.amount_value.toString()),
        due_date: formData.due_date || null,
        stage_id: automaticStageId,
        notes: formData.notes,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('contract_payment_terms')
        .update(updates)
        .eq('id', payment.id);

      if (error) throw error;

      // Log audit trail for each field that changed
      const changedFields: Array<{field: string, oldValue: any, newValue: any}> = [];
      
      if (payment.name !== formData.name) {
        changedFields.push({ field: 'name', oldValue: payment.name, newValue: formData.name });
      }
      if (payment.amount_type !== formData.amount_type) {
        changedFields.push({ field: 'amount_type', oldValue: payment.amount_type, newValue: formData.amount_type });
      }
      if (payment.amount_value !== parseFloat(formData.amount_value.toString())) {
        changedFields.push({ field: 'amount_value', oldValue: payment.amount_value, newValue: parseFloat(formData.amount_value.toString()) });
      }
      if (payment.due_date !== formData.due_date) {
        changedFields.push({ field: 'due_date', oldValue: payment.due_date, newValue: formData.due_date });
      }
      if (payment.stage_id !== automaticStageId) {
        changedFields.push({ field: 'stage_id', oldValue: payment.stage_id, newValue: automaticStageId });
      }
      if (payment.notes !== formData.notes) {
        changedFields.push({ field: 'notes', oldValue: payment.notes, newValue: formData.notes });
      }

      // Create audit logs for changed fields
      for (const change of changedFields) {
        await supabase.from('contract_audit_logs').insert({
          contract_id: contractId,
          tenant_id: currentTenant?.id,
          action: 'payment_field_updated',
          entity_type: 'payment_term',
          entity_id: payment.id,
          field_name: change.field,
          old_value: change.oldValue,
          new_value: change.newValue,
          user_id: user?.id,
          user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
          notes: `Payment ${change.field} updated`
        });
      }

      toast.success('Payment updated successfully');
      onSuccess();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Payment Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount_type">Amount Type</Label>
              <Select 
                value={formData.amount_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, amount_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount_value">
                {formData.amount_type === 'percentage' ? 'Percentage (%)' : 'Amount'}
              </Label>
              <Input
                id="amount_value"
                type="number"
                step={formData.amount_type === 'percentage' ? "0.01" : "0.01"}
                min="0"
                value={formData.amount_value}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_value: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add payment notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};