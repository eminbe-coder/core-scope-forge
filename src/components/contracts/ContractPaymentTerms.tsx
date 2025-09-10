import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Clock, CheckCircle, FileText, Upload, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';

interface PaymentTerm {
  id: string;
  installment_number: number;
  amount_type: string;
  amount_value: number;
  calculated_amount: number;
  due_date?: string;
  stage_id?: string;
  notes?: string;
  contract_payment_stages?: { name: string; sort_order: number } | null;
}

interface ContractPaymentTermsProps {
  contractId: string;
  canEdit: boolean;
  onUpdate: () => void;
}

export const ContractPaymentTerms = ({ contractId, canEdit, onUpdate }: ContractPaymentTermsProps) => {
  const { currentTenant } = useTenant();
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [paymentStages, setPaymentStages] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canUserEdit, setCanUserEdit] = useState(false);

  useEffect(() => {
    if (contractId && currentTenant?.id) {
      fetchData();
    }
  }, [contractId, currentTenant?.id]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user can modify this contract
      const { data: canModify } = await supabase.rpc('user_can_modify_contract', {
        _contract_id: contractId,
        _user_id: user.id
      });

      setCanUserEdit(canModify || false);

      const [paymentTermsRes, paymentStagesRes, todosRes, attachmentsRes] = await Promise.all([
        supabase
          .from('contract_payment_terms')
          .select(`
            *,
            contract_payment_stages (name, sort_order)
          `)
          .eq('contract_id', contractId)
          .order('installment_number'),
        
        supabase
          .from('contract_payment_stages')
          .select('*')
          .eq('tenant_id', currentTenant?.id)
          .order('sort_order'),
        
        supabase
          .from('contract_todos')
          .select('*')
          .eq('contract_id', contractId),
        
        supabase
          .from('contract_payment_attachments')
          .select('*')
          .eq('tenant_id', currentTenant?.id)
      ]);

      if (paymentTermsRes.error) throw paymentTermsRes.error;
      if (paymentStagesRes.error) throw paymentStagesRes.error;
      if (todosRes.error) throw todosRes.error;
      if (attachmentsRes.error) throw attachmentsRes.error;

      setPaymentTerms(paymentTermsRes.data as unknown as PaymentTerm[] || []);
      setPaymentStages(paymentStagesRes.data || []);
      setTodos(todosRes.data || []);
      setAttachments(attachmentsRes.data || []);
    } catch (error) {
      console.error('Error fetching payment terms:', error);
      toast.error('Failed to load payment terms');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStage = async (paymentTermId: string, newStageId: string) => {
    if (!canUserEdit || !canEdit) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const oldPaymentTerm = paymentTerms.find(pt => pt.id === paymentTermId);
      
      const { error } = await supabase
        .from('contract_payment_terms')
        .update({ stage_id: newStageId })
        .eq('id', paymentTermId);

      if (error) throw error;

      // Optimistic local update
      const selectedStage = paymentStages.find((s) => s.id === newStageId);
      setPaymentTerms((prev) => prev.map((pt) =>
        pt.id === paymentTermId
          ? { ...pt, stage_id: newStageId, contract_payment_stages: selectedStage ? { name: selectedStage.name, sort_order: selectedStage.sort_order } : pt.contract_payment_stages }
          : pt
      ));

      // Log audit trail
      await supabase.from('contract_audit_logs').insert({
        contract_id: contractId,
        tenant_id: currentTenant?.id,
        action: 'payment_stage_changed',
        entity_type: 'payment_term',
        entity_id: paymentTermId,
        field_name: 'stage_id',
        old_value: oldPaymentTerm?.stage_id,
        new_value: newStageId,
        user_id: user?.id,
        user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
        notes: 'Payment stage manually updated',
      });

      toast.success('Payment stage updated successfully');
      fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error updating payment stage:', error);
      toast.error('Failed to update payment stage');
    }
  };
  const updatePaymentDueDate = async (paymentTermId: string, newDueDate: string) => {
    if (!canUserEdit || !canEdit) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const oldPaymentTerm = paymentTerms.find(pt => pt.id === paymentTermId);
      
      const { error } = await supabase
        .from('contract_payment_terms')
        .update({ due_date: newDueDate })
        .eq('id', paymentTermId);

      if (error) throw error;

      // Optimistic local update
      setPaymentTerms((prev) => prev.map((pt) =>
        pt.id === paymentTermId ? { ...pt, due_date: newDueDate } : pt
      ));

      // Log audit trail
      await supabase.from('contract_audit_logs').insert({
        contract_id: contractId,
        tenant_id: currentTenant?.id,
        action: 'payment_due_date_changed',
        entity_type: 'payment_term',
        entity_id: paymentTermId,
        field_name: 'due_date',
        old_value: oldPaymentTerm?.due_date,
        new_value: newDueDate,
        user_id: user?.id,
        user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
        notes: 'Payment due date manually updated',
      });

      toast.success('Due date updated successfully');
      fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error updating due date:', error);
      toast.error('Failed to update due date');
    }
  };
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStageColor = (stageName?: string) => {
    switch ((stageName || '').toLowerCase()) {
      case 'pending':
      case 'pending task':
        return 'outline';
      case 'due':
        return 'default';
      case 'paid':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  const getPaymentProgress = (paymentTermId: string) => {
    const paymentTodos = todos.filter(todo => todo.payment_term_id === paymentTermId);
    if (paymentTodos.length === 0) return 100; // No todos means ready for due
    
    const completedTodos = paymentTodos.filter(todo => todo.completed);
    return Math.round((completedTodos.length / paymentTodos.length) * 100);
  };

  const getPaymentAttachments = (paymentTermId: string) => {
    return attachments.filter(att => att.payment_term_id === paymentTermId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {paymentTerms.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payment terms defined</h3>
            <p className="text-muted-foreground">
              Payment terms will be displayed here once they are added to the contract.
            </p>
          </CardContent>
        </Card>
      ) : (
        paymentTerms.map((paymentTerm) => {
          const progress = getPaymentProgress(paymentTerm.id);
          const paymentTodos = todos.filter(todo => todo.payment_term_id === paymentTerm.id);
          const completedTodos = paymentTodos.filter(todo => todo.completed);
          const paymentAttachments = getPaymentAttachments(paymentTerm.id);

          return (
            <Card key={paymentTerm.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payment {paymentTerm.installment_number}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStageColor(paymentTerm.contract_payment_stages?.name)}>
                      {paymentTerm.contract_payment_stages?.name || 'No Stage'}
                    </Badge>
                    {canUserEdit && canEdit && (
                      <Select
                        value={paymentTerm.stage_id || ''}
                        onValueChange={(value) => updatePaymentStage(paymentTerm.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <Settings className="h-4 w-4" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentStages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <p className="text-lg font-semibold">
                      {formatCurrency(paymentTerm.calculated_amount || paymentTerm.amount_value)}
                      <span className="text-sm text-muted-foreground ml-1">
                        ({paymentTerm.amount_type === 'percentage' ? `${paymentTerm.amount_value}%` : 'Fixed'})
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                    {canUserEdit && canEdit ? (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <input
                          type="date"
                          value={paymentTerm.due_date || ''}
                          onChange={(e) => updatePaymentDueDate(paymentTerm.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        />
                      </div>
                    ) : (
                      <p className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(paymentTerm.due_date)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Progress</label>
                    <div className="space-y-1">
                      <Progress value={progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {completedTodos.length}/{paymentTodos.length} tasks completed
                      </p>
                    </div>
                  </div>
                </div>

                {paymentTerm.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm">{paymentTerm.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        To-Do Items ({paymentTodos.length})
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => {
                          document.getElementById('contract-todos-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        View & Add
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {paymentTodos.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No to-do items</p>
                      ) : (
                        paymentTodos.slice(0, 3).map((todo) => (
                          <div key={todo.id} className="flex items-center gap-2 text-xs">
                            {todo.completed ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Clock className="h-3 w-3 text-yellow-600" />
                            )}
                            <span className={todo.completed ? 'line-through text-muted-foreground' : ''}>
                              {todo.title}
                            </span>
                          </div>
                        ))
                      )}
                      {paymentTodos.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{paymentTodos.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Attachments ({paymentAttachments.length})
                    </label>
                    <div className="space-y-1">
                      {paymentAttachments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No attachments</p>
                      ) : (
                        paymentAttachments.slice(0, 3).map((attachment) => (
                          <div key={attachment.id} className="flex items-center gap-2 text-xs">
                            <FileText className="h-3 w-3" />
                            <span>{attachment.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {attachment.attachment_type}
                            </Badge>
                          </div>
                        ))
                      )}
                      {paymentAttachments.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{paymentAttachments.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};