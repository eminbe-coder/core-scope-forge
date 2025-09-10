import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { TodoWidget } from '@/components/todos/TodoWidget';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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

export default function PaymentDetail() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const [payment, setPayment] = useState<PaymentTerm | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [contractCurrency, setContractCurrency] = useState<any>(null);
  const [tenantCurrency, setTenantCurrency] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  useEffect(() => {
    if (paymentId && currentTenant?.id) {
      fetchPaymentData();
    }
  }, [paymentId, currentTenant?.id]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      
      // Get payment details with contract info
      const { data: paymentData, error: paymentError } = await supabase
        .from('contract_payment_terms')
        .select(`
          *,
          contract_payment_stages (name, sort_order),
          contracts!inner (
            id, name, currency_id, tenant_id,
            customers (name),
            sites (name)
          )
        `)
        .eq('id', paymentId)
        .single();

      if (paymentError) throw paymentError;
      if (!paymentData) throw new Error('Payment not found');

      setPayment(paymentData);
      setContract(paymentData.contracts);
      setPaymentNotes(paymentData.notes || '');

      // Check if user can edit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: canModify } = await supabase.rpc('user_can_modify_contract', {
          _contract_id: paymentData.contract_id,
          _user_id: user.id
        });
        setCanEdit(canModify || false);
      }

      // Get contract currency
      if (paymentData.contracts.currency_id) {
        const { data: contractCurrencyData } = await supabase
          .from('currencies')
          .select('*')
          .eq('id', paymentData.contracts.currency_id)
          .single();
        if (contractCurrencyData) setContractCurrency(contractCurrencyData);
      }

      // Get tenant default currency
      if (currentTenant?.default_currency_id) {
        const { data: tenantCurrencyData } = await supabase
          .from('currencies')
          .select('*')
          .eq('id', currentTenant.default_currency_id)
          .single();
        if (tenantCurrencyData) setTenantCurrency(tenantCurrencyData);
      }

      // Get activities related to this payment
      const { data: activitiesData } = await supabase
        .from('activities')
        .select(`
          *,
          profiles!activities_created_by_fkey (first_name, last_name),
          profiles!activities_assigned_to_fkey (first_name, last_name)
        `)
        .eq('tenant_id', currentTenant?.id)
        .or(`entity_id.eq.${paymentId},notes.ilike.%payment ${paymentData.installment_number}%`)
        .order('created_at', { ascending: false });

      if (activitiesData) setActivities(activitiesData);

      // Get audit logs for this payment
      const { data: auditData } = await supabase
        .from('contract_audit_logs')
        .select('*')
        .eq('entity_id', paymentId)
        .eq('entity_type', 'payment_term')
        .order('created_at', { ascending: false });

      if (auditData) setAuditLogs(auditData);

      // Auto-update payment stage after data fetch
      if (paymentData) {
        await autoUpdatePaymentStage(paymentData);
      }

    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const autoUpdatePaymentStage = async (paymentData: PaymentTerm) => {
    if (!canEdit || !currentTenant?.id) return;

    try {
      // Get todos for this payment
      const { data: todos } = await supabase
        .from('todos')
        .select('*')
        .eq('entity_type', 'contract')
        .eq('payment_term_id', paymentData.id);

      // Get available stages
      const { data: stages } = await supabase
        .from('contract_payment_stages')
        .select('*')
        .eq('tenant_id', currentTenant.id);

      if (!stages) return;

      const paymentTodos = todos || [];
      const incompleteTodos = paymentTodos.filter(todo => todo.status !== 'completed');
      const today = new Date();
      const dueDate = paymentData.due_date ? new Date(paymentData.due_date) : null;

      let recommendedStage = null;

      // Logic: If there are incomplete todos, should be "Pending"
      // If all todos complete and due date passed, should be "Due"  
      // If no todos and due date passed, should be "Due"
      if (incompleteTodos.length > 0) {
        recommendedStage = stages.find(stage => stage.name === 'Pending');
      } else if (dueDate && dueDate <= today) {
        recommendedStage = stages.find(stage => stage.name === 'Due');
      } else if (paymentTodos.length === 0 && dueDate && dueDate <= today) {
        recommendedStage = stages.find(stage => stage.name === 'Due');
      }

      // Update stage if needed
      if (recommendedStage && recommendedStage.id !== paymentData.stage_id) {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('contract_payment_terms')
          .update({ 
            stage_id: recommendedStage.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentData.id);

        if (!error) {
          // Log audit trail
          await supabase.from('contract_audit_logs').insert({
            contract_id: paymentData.contract_id,
            tenant_id: currentTenant.id,
            action: 'payment_stage_auto_updated',
            entity_type: 'payment_term',
            entity_id: paymentData.id,
            field_name: 'stage_id',
            old_value: paymentData.stage_id,
            new_value: recommendedStage.id,
            user_id: user?.id,
            user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
            notes: 'Payment stage automatically updated based on task completion status'
          });

          // Refresh data to show updated stage
          setTimeout(() => fetchPaymentData(), 100);
        }
      }
    } catch (error) {
      console.error('Error auto-updating payment stage:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = contractCurrency || tenantCurrency;
    const currencyCode = currency?.code || 'USD';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount || 0);
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

  const saveNotes = async () => {
    if (!canEdit) return;
    
    try {
      setIsSavingNotes(true);
      const { error } = await supabase
        .from('contract_payment_terms')
        .update({ 
          notes: paymentNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      setPayment(prev => prev ? { ...prev, notes: paymentNotes } : null);
      toast.success('Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!payment || !contract) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Payment not found</h2>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contract
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {payment.name || `Payment ${payment.installment_number}`}
              </h1>
              <p className="text-muted-foreground">
                Contract: {contract.name}
              </p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Payment
            </Button>
          )}
        </div>

        {/* Payment Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Details
              </CardTitle>
              <Badge variant={getStageColor(payment.contract_payment_stages?.name)}>
                {payment.contract_payment_stages?.name || 'No Stage'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Amount</label>
              <p className="text-lg font-semibold">
                {formatCurrency(payment.calculated_amount || payment.amount_value)}
                <span className="text-sm text-muted-foreground ml-1">
                  ({payment.amount_type === 'percentage' ? `${payment.amount_value}%` : 'Fixed'})
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Due Date</label>
              <p className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(payment.due_date)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contract</label>
              <p className="text-sm">
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-left"
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  {contract.name}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="todos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="todos">To-Do Items</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>To-Do Items</CardTitle>
              </CardHeader>
              <CardContent>
                <TodoWidget 
                  entityType="contract" 
                  entityId={contract.id} 
                  paymentTermId={payment.id}
                  canEdit={canEdit} 
                  compact={false}
                  includeChildren={false}
                  onUpdate={() => {
                    fetchPaymentData();
                    // Also trigger stage update after todo changes
                    setTimeout(() => {
                      if (payment) {
                        autoUpdatePaymentStage(payment);
                      }
                    }, 200);
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {canEdit ? (
                  <div className="space-y-2">
                    <textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Add notes about this payment..."
                      className="w-full min-h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button 
                      onClick={saveNotes} 
                      disabled={isSavingNotes}
                      className="w-fit"
                    >
                      {isSavingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    {payment.notes ? (
                      <p className="whitespace-pre-wrap">{payment.notes}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No notes added</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Related Activities</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-muted-foreground">No activities found for this payment</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="border-l-2 border-primary pl-4 pb-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{activity.title}</h4>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(activity.created_at)}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            Created by: {activity.profiles?.first_name} {activity.profiles?.last_name}
                          </span>
                          {activity.assigned_to && (
                            <span>
                              Assigned to: {activity.assigned_to_profile?.first_name} {activity.assigned_to_profile?.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground">No audit logs found</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="border-l-2 border-muted pl-4 pb-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          By: {log.user_name || 'System'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Payment Modal */}
        {isEditing && (
          <EditPaymentForm
            payment={payment}
            contractId={contract.id}
            onSuccess={() => {
              setIsEditing(false);
              fetchPaymentData();
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}