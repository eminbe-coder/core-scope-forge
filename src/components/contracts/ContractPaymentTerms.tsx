import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, Clock, CheckCircle, FileText, Upload, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { TodoWidget } from '@/components/todos/TodoWidget';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditPaymentForm } from '@/components/forms/EditPaymentForm';
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
  const navigate = useNavigate();
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [paymentStages, setPaymentStages] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [contractCurrency, setContractCurrency] = useState<any>(null);
  const [tenantCurrency, setTenantCurrency] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [canUserEdit, setCanUserEdit] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentTerm | null>(null);
  const autoUpdatingRef = useRef(false);
  const initialLoadRef = useRef(false);
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
      const [paymentTermsRes, paymentStagesRes, todosRes, attachmentsRes, contractRes, tenantCurrencyRes] = await Promise.all([
        supabase.from('contract_payment_terms').select(`
            *,
            contract_payment_stages (name, sort_order)
          `).eq('contract_id', contractId).order('installment_number'),
        supabase.from('contract_payment_stages').select('*').eq('tenant_id', currentTenant?.id).order('sort_order'),
        supabase.from('todos').select('*').eq('entity_type', 'contract').eq('entity_id', contractId),
        supabase.from('contract_payment_attachments').select('*').eq('tenant_id', currentTenant?.id),
        supabase.from('contracts').select('currency_id').eq('id', contractId).single(),
        supabase.from('currencies').select('*').eq('id', currentTenant?.default_currency_id).single()
      ]);
      if (paymentTermsRes.error) throw paymentTermsRes.error;
      if (paymentStagesRes.error) throw paymentStagesRes.error;
      if (todosRes.error) throw todosRes.error;
      if (attachmentsRes.error) throw attachmentsRes.error;

      // Set tenant currency
      if (tenantCurrencyRes.data) {
        setTenantCurrency(tenantCurrencyRes.data);
      }

      // Get contract currency if available
      if (contractRes.data?.currency_id) {
        const contractCurrencyRes = await supabase
          .from('currencies')
          .select('*')
          .eq('id', contractRes.data.currency_id)
          .single();
        if (contractCurrencyRes.data) {
          setContractCurrency(contractCurrencyRes.data);
        }
      }
      setPaymentTerms(paymentTermsRes.data as unknown as PaymentTerm[] || []);
      setPaymentStages(paymentStagesRes.data || []);
      setTodos(todosRes.data || []);
      setAttachments(attachmentsRes.data || []);
      
      // Auto-update stages only on initial load
      if (!initialLoadRef.current && paymentTermsRes.data && paymentStagesRes.data) {
        initialLoadRef.current = true;
        setTimeout(() => {
          autoUpdatePaymentStages('initial_load');
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching payment terms:', error);
      toast.error('Failed to load payment terms');
    } finally {
      setLoading(false);
    }
  };
  const getAutomaticStage = (paymentTerm: PaymentTerm, triggerType: 'due_date_change' | 'all_tasks_completed' | 'initial_load') => {
    const paymentTodos = todos.filter(todo => todo.payment_term_id === paymentTerm.id);
    const incompleteTodos = paymentTodos.filter(todo => todo.status !== 'completed');
    const today = new Date();
    const dueDate = paymentTerm.due_date ? new Date(paymentTerm.due_date) : null;

    // Simple logic: If there are incomplete todos, should be "Pending"
    // If all todos complete (or no todos) and due date passed, should be "Due"
    if (incompleteTodos.length > 0) {
      return paymentStages.find(stage => stage.name === 'Pending') || null;
    } else if (dueDate && dueDate <= today) {
      return paymentStages.find(stage => stage.name === 'Due') || null;
    } else {
      return paymentStages.find(stage => stage.name === 'Pending') || null;
    }
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

      // Update local state immediately for UI responsiveness
      setPaymentTerms(prevTerms => 
        prevTerms.map(term => 
          term.id === paymentTermId 
            ? { 
                ...term, 
                stage_id: newStageId,
                contract_payment_stages: paymentStages.find(s => s.id === newStageId) || term.contract_payment_stages
              }
            : term
        )
      );
      
      onUpdate();
    } catch (error) {
      console.error('Error updating payment stage:', error);
      if (!isAutomatic) {
        toast.error('Failed to update payment stage');
      }
    }
  };

  // Auto-update payment stages based on business rules  
  const autoUpdatePaymentStages = async (triggerType: 'initial_load' | 'due_date_change' = 'initial_load') => {
    if (!canUserEdit || !canEdit || paymentTerms.length === 0) return;
    
    try {
      autoUpdatingRef.current = true;
      
      for (const paymentTerm of paymentTerms) {
        const recommendedStage = getAutomaticStage(paymentTerm, triggerType);
        
        if (recommendedStage && recommendedStage.id !== paymentTerm.stage_id) {
          await updatePaymentStage(paymentTerm.id, recommendedStage.id, true);
        }
      }
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
      
      // Update local state and trigger auto-stage update
      await fetchData();
      onUpdate();
      
      // Auto-update stage after due date change (only for this payment term)
      setTimeout(() => {
        const updatedTerm = paymentTerms.find(pt => pt.id === paymentTermId);
        if (updatedTerm) {
          const recommendedStage = getAutomaticStage({
            ...updatedTerm,
            due_date: newDueDate
          }, 'due_date_change');
          if (recommendedStage && recommendedStage.id !== updatedTerm.stage_id) {
            updatePaymentStage(paymentTermId, recommendedStage.id, true);
          }
        }
      }, 200);
    } catch (error) {
      console.error('Error updating due date:', error);
      toast.error('Failed to update due date');
    }
  };

  // Check for completed todos and update payment stages accordingly
  useEffect(() => {
    if (autoUpdatingRef.current || !initialLoadRef.current) return;
    if (todos.length >= 0 && paymentTerms.length > 0 && paymentStages.length > 0) {
      const timeoutId = setTimeout(() => {
        // Check each payment term to see if all tasks are completed
        paymentTerms.forEach(async (paymentTerm) => {
          const paymentTodos = todos.filter(todo => todo.payment_term_id === paymentTerm.id);
          const incompleteTodos = paymentTodos.filter(todo => todo.status !== 'completed');
          
          // Only trigger auto-update if all tasks are now completed and there are tasks
          if (paymentTodos.length > 0 && incompleteTodos.length === 0) {
            const recommendedStage = getAutomaticStage(paymentTerm, 'all_tasks_completed');
            if (recommendedStage && recommendedStage.id !== paymentTerm.stage_id) {
              await updatePaymentStage(paymentTerm.id, recommendedStage.id, true);
            }
          }
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [todos]);

  // Auto-update stages when todos are completed/updated
  const handleTodoUpdate = async () => {
    await fetchData();
  };
  const formatCurrency = (amount: number) => {
    const currency = contractCurrency || tenantCurrency;
    const currencySymbol = currency?.symbol || '$';
    const currencyCode = currency?.code || 'USD';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount || 0);
  };

  const updatePaymentName = async (paymentTermId: string, newName: string) => {
    if (!canUserEdit || !canEdit) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const oldPaymentTerm = paymentTerms.find(pt => pt.id === paymentTermId);

      const { error } = await supabase
        .from('contract_payment_terms')
        .update({ 
          name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentTermId);

      if (error) throw error;

      // Log audit trail
      await supabase.from('contract_audit_logs').insert({
        contract_id: contractId,
        tenant_id: currentTenant?.id,
        action: 'payment_name_changed',
        entity_type: 'payment_term',
        entity_id: paymentTermId,
        field_name: 'name',
        old_value: oldPaymentTerm?.name,
        new_value: newName,
        user_id: user?.id,
        user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
        notes: 'Payment name manually updated'
      });

      toast.success('Payment name updated successfully');
      
      // Update local state immediately
      setPaymentTerms(prevTerms => 
        prevTerms.map(term => 
          term.id === paymentTermId 
            ? { ...term, name: newName }
            : term
        )
      );
      
      onUpdate();
    } catch (error) {
      console.error('Error updating payment name:', error);
      toast.error('Failed to update payment name');
    }
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

  const handleEditPayment = (payment: PaymentTerm) => {
    setEditingPayment(payment);
  };

  const handleEditPaymentSuccess = () => {
    setEditingPayment(null);
    fetchData();
    onUpdate();
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
            <h3 className="text-lg font-semibold mb-2">No instalment terms defined</h3>
            <p className="text-muted-foreground">
              Instalment terms will be displayed here once they are added to the contract.
            </p>
          </CardContent>
        </Card> : paymentTerms.map(paymentTerm => {
      const progress = getPaymentProgress(paymentTerm.id);
      const paymentTodos = todos.filter(todo => todo.payment_term_id === paymentTerm.id);
      const completedTodos = paymentTodos.filter(todo => todo.status === 'completed');
      const paymentAttachments = getPaymentAttachments(paymentTerm.id);
        return <Card key={paymentTerm.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/installments/${paymentTerm.id}`)}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    <span>{paymentTerm.name || `Instalment ${paymentTerm.installment_number}`}</span>
                  </CardTitle>
                   <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                     {canUserEdit && canEdit && (
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleEditPayment(paymentTerm);
                         }}
                       >
                         <Edit className="h-3 w-3 mr-1" />
                         Edit
                       </Button>
                     )}
                     {canUserEdit && canEdit ? (
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <button aria-label="Change payment stage" className="outline-none">
                             <Badge variant={getStageColor(paymentTerm.contract_payment_stages?.name)} className="cursor-pointer">
                               {paymentTerm.contract_payment_stages?.name || 'No Stage'}
                             </Badge>
                           </button>
                         </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50 bg-background border shadow-md">
                            {paymentStages.map(stage => (
                              <DropdownMenuItem 
                                key={stage.id} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updatePaymentStage(paymentTerm.id, stage.id);
                                }}
                                className="cursor-pointer"
                              >
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
    
    {editingPayment && (
      <EditPaymentForm
        payment={editingPayment}
        contractId={contractId}
        onSuccess={handleEditPaymentSuccess}
        onCancel={() => setEditingPayment(null)}
      />
    )}
    </div>;
};