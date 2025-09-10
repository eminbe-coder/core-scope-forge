import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function InstallmentDetail() {
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
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
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

      return paymentData as PaymentTerm;
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const autoUpdatePaymentStage = async () => {
    if (!payment || !canEdit || !currentTenant?.id) return;

    try {
      // Get todos for this payment
      const { data: todos } = await supabase
        .from('todos')
        .select('*')
        .eq('entity_type', 'contract')
        .eq('payment_term_id', payment.id);

      const paymentTodos = todos || [];
      const incompleteTodos = paymentTodos.filter(todo => todo.status !== 'completed');
      
      const today = new Date().toISOString().split('T')[0];
      const isDueDatePassed = payment.due_date && payment.due_date <= today;

      let newPaymentStatus = 'pending';

      // Determine status based on rules
      if (incompleteTodos.length === 0 && isDueDatePassed) {
        newPaymentStatus = 'due';
      } else {
        newPaymentStatus = 'pending';
      }

      // Don't change status if already paid
      if ((payment as any)?.payment_status === 'paid') {
        return;
      }

      // Update status if different from current
      if (newPaymentStatus !== (payment as any)?.payment_status) {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
          .from('contract_payment_terms')
          .update({ 
            payment_status: newPaymentStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (!error) {
          // Log audit trail
          await supabase.from('contract_audit_logs').insert({
            contract_id: payment.contract_id,
            tenant_id: currentTenant.id,
            action: 'payment_status_auto_updated',
            entity_type: 'payment_term',
            entity_id: payment.id,
            field_name: 'payment_status',
            old_value: (payment as any)?.payment_status,
            new_value: newPaymentStatus,
            user_id: user?.id,
            user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
            notes: 'Payment status auto-updated based on task completion and due date'
          });

          // Refresh payment data
          await fetchPaymentData();
        }
      }
    } catch (error) {
      console.error('Error auto-updating payment status:', error);
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

  const registerPayment = async () => {
    if (!payment || !receivedAmount || !canEdit) return;

    const amount = parseFloat(receivedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setIsRegisteringPayment(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // For now, just update the payment status to partly paid if amount is less than installment
      const installmentAmount = payment.calculated_amount || payment.amount_value;
      const newStatus = amount >= installmentAmount ? 'paid' : 'partly paid';
      
      // Update payment term with received amount (cumulative for now)
      const currentReceived = (payment as any)?.received_amount || 0;
      const totalReceived = currentReceived + amount;
      const finalStatus = totalReceived >= installmentAmount ? 'paid' : 'partly paid';
      
      const { error } = await supabase
        .from('contract_payment_terms')
        .update({
          received_amount: totalReceived,
          received_date: new Date().toISOString().split('T')[0],
          payment_status: finalStatus,
          updated_at: new Date().toISOString()
        } as any) // Type cast since these columns exist but aren't in types yet
        .eq('id', payment.id);

      if (error) throw error;

      // Log audit trail
      await supabase.from('contract_audit_logs').insert({
        contract_id: payment.contract_id,
        tenant_id: currentTenant?.id,
        action: 'payment_registered',
        entity_type: 'payment_term',
        entity_id: payment.id,
        field_name: 'payment_status',
        old_value: (payment as any).payment_status,
        new_value: finalStatus,
        user_id: user?.id,
        user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
        notes: `Payment registered: ${formatCurrency(amount)} received. Total: ${formatCurrency(totalReceived)}`
      });

      toast.success('Payment registered successfully');
      setReceivedAmount('');
      setIsRegisteringPayment(false);
      await fetchPaymentData();
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error('Failed to register payment');
      setIsRegisteringPayment(false);
    }
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

  const getPaymentStatusColor = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':
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
          {canEdit && ((payment as any)?.payment_status !== 'paid') && (
            <div className="flex gap-2">
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Payment
              </Button>
              <Button variant="outline" onClick={() => setIsRegisteringPayment(true)}>
                <DollarSign className="h-4 w-4 mr-2" />
                Register Payment
              </Button>
            </div>
          )}
        </div>

        {/* Payment Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Instalment Details
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant={getPaymentStatusColor((payment as any)?.payment_status)}>
                  {(payment as any)?.payment_status || 'Pending'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Amount Due</label>
              <p className="text-lg font-semibold">
                {formatCurrency(payment.calculated_amount || payment.amount_value)}
                <span className="text-sm text-muted-foreground ml-1">
                  ({payment.amount_type === 'percentage' ? `${payment.amount_value}%` : 'Fixed'})
                </span>
              </p>
            </div>
            {(payment as any)?.received_amount && (payment as any)?.received_amount > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount Received</label>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency((payment as any)?.received_amount || 0)}
                  {(payment as any)?.received_date && (
                    <span className="text-sm text-muted-foreground ml-1 block">
                      on {formatDate((payment as any)?.received_date)}
                    </span>
                  )}
                </p>
              </div>
            )}
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
                  onUpdate={async () => {
                    await autoUpdatePaymentStage();
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
            onSuccess={async () => {
              setIsEditing(false);
              await fetchPaymentData();
              await autoUpdatePaymentStage();
            }}
            onCancel={() => setIsEditing(false)}
          />
        )}

        {/* Register Payment Modal */}
        {isRegisteringPayment && (
          <Dialog open={true} onOpenChange={() => setIsRegisteringPayment(false)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Register Payment</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Amount Due</label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(payment.calculated_amount || payment.amount_value)}
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="received_amount">Amount Received</Label>
                  <Input
                    id="received_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="Enter received amount"
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsRegisteringPayment(false);
                    setReceivedAmount('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={registerPayment} 
                  disabled={!receivedAmount || isRegisteringPayment || parseFloat(receivedAmount || '0') <= 0}
                >
                  {isRegisteringPayment ? 'Registering...' : 'Register Payment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}