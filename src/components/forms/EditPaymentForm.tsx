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
  payment_status?: string;
  received_amount?: number;
  received_date?: string;
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
  const [contractValue, setContractValue] = useState<number>(0);
  const [formData, setFormData] = useState({
    name: payment.name || `Payment ${payment.installment_number}`,
    amount_type: payment.amount_type,
    amount_value: payment.amount_value,
    due_date: payment.due_date || '',
    notes: payment.notes || '',
    payment_status: payment.payment_status || 'pending',
    received_amount: payment.received_amount || 0,
    received_date: payment.received_date || ''
  });

  useEffect(() => {
    const fetchContractValue = async () => {
      const { data: contract } = await supabase
        .from('contracts')
        .select('value')
        .eq('id', contractId)
        .single();
      
      if (contract?.value) {
        setContractValue(contract.value);
      }
    };
    
    fetchContractValue();
  }, [contractId]);

  const calculateAmount = () => {
    if (formData.amount_type === 'percentage') {
      return (formData.amount_value / 100) * contractValue;
    }
    return formData.amount_value;
  };

  const getAutomaticStage = async (dueDate: string | null, paymentStatus: string, receivedAmount: number, calculatedAmount: number) => {
    try {
      // Get payment stages
      const { data: stages } = await supabase
        .from('contract_payment_stages')
        .select('*')
        .eq('tenant_id', currentTenant?.id);

      if (!stages) return null;

      // Check payment status first
      if (paymentStatus === 'paid' || receivedAmount >= calculatedAmount) {
        return stages.find(stage => stage.name === 'Paid')?.id || null;
      }

      if (paymentStatus === 'partial' || (receivedAmount > 0 && receivedAmount < calculatedAmount)) {
        return stages.find(stage => stage.name === 'Partially Paid')?.id || null;
      }

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
      
      const calculatedAmount = calculateAmount();
      
      // Get automatic stage based on current rules
      const automaticStageId = await getAutomaticStage(
        formData.due_date || null, 
        formData.payment_status, 
        formData.received_amount, 
        calculatedAmount
      );
      
      const updates = {
        name: formData.name,
        amount_type: formData.amount_type,
        amount_value: parseFloat(formData.amount_value.toString()),
        calculated_amount: calculatedAmount,
        due_date: formData.due_date || null,
        stage_id: automaticStageId,
        notes: formData.notes,
        payment_status: formData.payment_status,
        received_amount: formData.received_amount,
        received_date: formData.received_date || null,
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

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Payment Receipt</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="payment_status">Status</Label>
                <Select 
                  value={formData.payment_status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partially Paid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="received_amount">Received Amount</Label>
                <Input
                  id="received_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={calculateAmount()}
                  value={formData.received_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, received_amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <Label htmlFor="received_date">Received Date</Label>
                <Input
                  id="received_date"
                  type="date"
                  value={formData.received_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, received_date: e.target.value }))}
                />
              </div>
            </div>
            
            {formData.amount_type === 'percentage' && contractValue > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Calculated amount: {(formData.amount_value / 100 * contractValue).toLocaleString('en-US', { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2 
                })}
              </p>
            )}
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