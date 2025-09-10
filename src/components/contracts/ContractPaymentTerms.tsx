import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';


import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Clock, CheckCircle, FileText, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { TodoWidget } from '@/components/todos/TodoWidget';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
interface PaymentTerm {
  id: string;
  installment_number: number;
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
interface ContractPaymentTermsProps {
  contractId: string;
  canEdit: boolean;
  onUpdate: () => void;
}
export const ContractPaymentTerms = ({
  contractId,
  canEdit,
  onUpdate
}: ContractPaymentTermsProps) => {
  const {
    currentTenant
  } = useTenant();
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [paymentStages, setPaymentStages] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canUserEdit, setCanUserEdit] = useState(false);
  const autoUpdatingRef = useRef(false);
  const autoUpdateNotifiedRef = useRef(false);
  useEffect(() => {
    if (contractId && currentTenant?.id) {
      fetchData();
    }
  }, [contractId, currentTenant?.id]);
  const fetchData = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user can modify this contract
      const {
        data: canModify
      } = await supabase.rpc('user_can_modify_contract', {
        _contract_id: contractId,
        _user_id: user.id
      });
      setCanUserEdit(canModify || false);
      const [paymentTermsRes, paymentStagesRes, todosRes, attachmentsRes] = await Promise.all([supabase.from('contract_payment_terms').select(`
            *,
            contract_payment_stages (name, sort_order)
          `).eq('contract_id', contractId).order('installment_number'), supabase.from('contract_payment_stages').select('*').eq('tenant_id', currentTenant?.id).order('sort_order'), supabase.from('todos').select('*').eq('entity_type', 'contract').eq('entity_id', contractId), supabase.from('contract_payment_attachments').select('*').eq('tenant_id', currentTenant?.id)]);
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
  const getAutomaticStage = (paymentTerm: PaymentTerm) => {
    const paymentTodos = todos.filter(todo => todo.payment_term_id === paymentTerm.id);
    const incompleteTodos = paymentTodos.filter(todo => todo.status !== 'completed');
    const today = new Date();
    const dueDate = paymentTerm.due_date ? new Date(paymentTerm.due_date) : null;

    // Do not auto-change if current stage is neither Pending nor Due (e.g., Paid)
    const currentStageName = paymentTerm.contract_payment_stages?.name?.toLowerCase();
    if (currentStageName && !['pending', 'due'].includes(currentStageName)) {
      return null;
    }

    // If no due date set, return Pending
    if (!dueDate) {
      return paymentStages.find(stage => stage.name === 'Pending') || null;
    }

    // If due date is today or past AND no incomplete tasks, set to Due
    if (dueDate <= today && incompleteTodos.length === 0) {
      return paymentStages.find(stage => stage.name === 'Due') || null;
    }

    // Otherwise Pending
    return paymentStages.find(stage => stage.name === 'Pending') || null;
  };
  const updatePaymentStage = async (paymentTermId: string, newStageId: string, isAutomatic = false) => {
    if (!canUserEdit || !canEdit) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const oldPaymentTerm = paymentTerms.find(pt => pt.id === paymentTermId);

      // Skip update if stage is already the same
      if (oldPaymentTerm?.stage_id === newStageId) {
        return;
      }
      const {
        error
      } = await supabase.from('contract_payment_terms').update({
        stage_id: newStageId,
        updated_at: new Date().toISOString()
      }).eq('id', paymentTermId);
      if (error) throw error;

      // Log audit trail
      await supabase.from('contract_audit_logs').insert({
        contract_id: contractId,
        tenant_id: currentTenant?.id,
        action: isAutomatic ? 'payment_stage_auto_updated' : 'payment_stage_changed',
        entity_type: 'payment_term',
        entity_id: paymentTermId,
        field_name: 'stage_id',
        old_value: oldPaymentTerm?.stage_id,
        new_value: newStageId,
        user_id: user?.id,
        user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
        notes: isAutomatic ? 'Payment stage automatically updated based on due date and task completion' : 'Payment stage manually updated'
      });
      if (!isAutomatic) {
        toast.success('Payment stage updated successfully');
      }

      // Refetch data to ensure consistency
      await fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error updating payment stage:', error);
      if (!isAutomatic) {
        toast.error('Failed to update payment stage');
      }
    }
  };

  // Auto-update payment stages based on business rules
  const autoUpdatePaymentStages = async () => {
    if (!canUserEdit || !canEdit || paymentTerms.length === 0) return;
    try {
      autoUpdatingRef.current = true;
      let hasUpdates = false;
      for (const paymentTerm of paymentTerms) {
        const recommendedStage = getAutomaticStage(paymentTerm);
        if (!recommendedStage) continue; // respect manual statuses like Paid
        if (recommendedStage.id !== paymentTerm.stage_id) {
          await updatePaymentStage(paymentTerm.id, recommendedStage.id, true);
          hasUpdates = true;
        }
      }
      // No toast here to avoid notification loops
    } catch (error) {
      console.error('Error auto-updating payment stages:', error);
    } finally {
      autoUpdatingRef.current = false;
    }
  };
  const updatePaymentDueDate = async (paymentTermId: string, newDueDate: string) => {
    if (!canUserEdit || !canEdit) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const oldPaymentTerm = paymentTerms.find(pt => pt.id === paymentTermId);
      const {
        error
      } = await supabase.from('contract_payment_terms').update({
        due_date: newDueDate,
        updated_at: new Date().toISOString()
      }).eq('id', paymentTermId);
      if (error) throw error;

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
        notes: 'Payment due date manually updated'
      });
      toast.success('Due date updated successfully');
      // Refetch data to ensure consistency and trigger auto-stage update
      await fetchData();
      onUpdate();

      // Auto-update stage after due date change
      setTimeout(() => {
        autoUpdatePaymentStages();
      }, 100);
    } catch (error) {
      console.error('Error updating due date:', error);
      toast.error('Failed to update due date');
    }
  };

  // Auto-update payment stages when data changes
  useEffect(() => {
    if (autoUpdatingRef.current) return;
    if (paymentTerms.length > 0 && todos.length >= 0 && paymentStages.length > 0) {
      // Small delay to ensure all data is loaded
      const timeoutId = setTimeout(() => {
        autoUpdatePaymentStages();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [paymentTerms, todos, paymentStages]);

  // Auto-update stages when todos are completed/updated
  const handleTodoUpdate = async () => {
    await fetchData();
    setTimeout(() => {
      autoUpdatePaymentStages();
    }, 100);
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

    const completedTodos = paymentTodos.filter(todo => todo.status === 'completed');
    return Math.round(completedTodos.length / paymentTodos.length * 100);
  };
  const getPaymentAttachments = (paymentTermId: string) => {
    return attachments.filter(att => att.payment_term_id === paymentTermId);
  };
  if (loading) {
    return <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>)}
          </div>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-4">
      {paymentTerms.length === 0 ? <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payment terms defined</h3>
            <p className="text-muted-foreground">
              Payment terms will be displayed here once they are added to the contract.
            </p>
          </CardContent>
        </Card> : paymentTerms.map(paymentTerm => {
      const progress = getPaymentProgress(paymentTerm.id);
      const paymentTodos = todos.filter(todo => todo.payment_term_id === paymentTerm.id);
      const completedTodos = paymentTodos.filter(todo => todo.status === 'completed');
      const paymentAttachments = getPaymentAttachments(paymentTerm.id);
      return <Card key={paymentTerm.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payment {paymentTerm.installment_number}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {canUserEdit && canEdit ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button aria-label="Change payment stage" className="outline-none">
                            <Badge variant={getStageColor(paymentTerm.contract_payment_stages?.name)} className="cursor-pointer">
                              {paymentTerm.contract_payment_stages?.name || 'No Stage'}
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-50">
                          {paymentStages.map(stage => (
                            <DropdownMenuItem key={stage.id} onClick={() => updatePaymentStage(paymentTerm.id, stage.id)}>
                              {stage.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Badge variant={getStageColor(paymentTerm.contract_payment_stages?.name)}>
                        {paymentTerm.contract_payment_stages?.name || 'No Stage'}
                      </Badge>
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
                    {canUserEdit && canEdit ? <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <input type="date" value={paymentTerm.due_date || ''} onChange={e => updatePaymentDueDate(paymentTerm.id, e.target.value)} className="text-sm border rounded px-2 py-1 bg-slate-400" />
                      </div> : <p className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(paymentTerm.due_date)}
                      </p>}
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

                {paymentTerm.notes && <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="text-sm">{paymentTerm.notes}</p>
                  </div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        To-Do Items ({paymentTodos.length})
                      </label>
                    </div>
                    <div className="bg-muted/20 p-3 rounded-lg">
                      <TodoWidget entityType="contract" entityId={contractId} paymentTermId={paymentTerm.id} canEdit={canUserEdit && canEdit} compact={true} includeChildren={false} onUpdate={handleTodoUpdate} />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Attachments ({paymentAttachments.length})
                    </label>
                    <div className="space-y-1">
                      {paymentAttachments.length === 0 ? <p className="text-xs text-muted-foreground">No attachments</p> : paymentAttachments.slice(0, 3).map(attachment => <div key={attachment.id} className="flex items-center gap-2 text-xs">
                            <FileText className="h-3 w-3" />
                            <span>{attachment.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {attachment.attachment_type}
                            </Badge>
                          </div>)}
                      {paymentAttachments.length > 3 && <p className="text-xs text-muted-foreground">
                          +{paymentAttachments.length - 3} more
                        </p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>;
    })}
    </div>;
};