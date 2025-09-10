import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Plus, FileText, Calendar, Users, Building2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';
import { ContractTodos } from '@/components/contracts/ContractTodos';
import { ContractAuditTrail } from '@/components/contracts/ContractAuditTrail';
import { ContractPaymentTerms } from '@/components/contracts/ContractPaymentTerms';

interface Contract {
  id: string;
  name: string;
  description?: string;
  value?: number;
  status: string;
  signed_date?: string;
  start_date?: string;
  end_date?: string;
  assigned_to?: string;
  customer_reference_number?: string;
  notes?: string;
  created_at: string;
  customers?: { name: string } | null;
  currencies?: { code: string; symbol: string } | null;
  sites?: { name: string; address: string } | null;
  profiles?: { first_name: string; last_name: string } | null;
}

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { isAdmin } = usePermissions();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (id && currentTenant?.id) {
      fetchContract();
    }
  }, [id, currentTenant?.id]);

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (name),
          currencies (code, symbol),
          sites (name, address),
          profiles (first_name, last_name)
        `)
        .eq('id', id)
        .eq('tenant_id', currentTenant?.id)
        .single();

      if (error) throw error;
      setContract(data as unknown as Contract);
      
      // Check if user can edit - only assigned salesperson or admin
      const { data: { user } } = await supabase.auth.getUser();
      const canUserEdit = isAdmin || data.assigned_to === user?.id;
      setCanEdit(canUserEdit);
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast.error('Failed to load contract details');
      navigate('/contracts');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number, currency?: { code: string; symbol: string }) => {
    if (!amount || !currency) return '-';
    return `${currency.symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'draft': return 'outline';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/contracts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Loading...</h1>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contract) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/contracts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Contract not found</h1>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/contracts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{contract.name}</h1>
              <p className="text-sm text-muted-foreground">
                Customer: {contract.customers?.name || 'Not assigned'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(contract.status)}>
              {contract.status}
            </Badge>
            {canEdit && (
              <Button variant="outline" onClick={() => navigate(`/contracts/${contract.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Contract
              </Button>
            )}
          </div>
        </div>

        {/* Main Layout - Mirror Deal Page */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Customer & Site */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4" />
                  Customer & Site
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium text-sm">
                    {contract.customers?.name || 'Not assigned'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Site</p>
                  <p className="font-medium text-sm">
                    {contract.sites?.name || 'Not assigned'}
                  </p>
                  {contract.sites?.address && (
                    <p className="text-xs text-muted-foreground">{contract.sites.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* To-Do Tasks */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  To-Do Tasks
                  {canEdit && (
                    <Button size="sm" variant="outline" className="ml-auto h-6 px-2">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Task
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContractTodos 
                  contractId={contract.id} 
                  canEdit={canEdit}
                  onUpdate={fetchContract}
                  compact={true}
                />
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-medium">
                    {formatCurrency(contract.value, contract.currencies)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-medium">{formatDate(contract.start_date)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="font-medium">{formatDate(contract.end_date)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{formatDate(contract.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Contract Information */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Contract Information</CardTitle>
                <p className="text-sm text-muted-foreground">Basic contract details and status</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Stage</p>
                    <p className="font-medium">{contract.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Contract Value</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(contract.value, contract.currencies)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Signed Date</p>
                    <p className="font-medium">{formatDate(contract.signed_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Currency</p>
                    <p className="font-medium">
                      {contract.currencies?.code || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Salesperson</p>
                    <p className="font-medium">
                      {contract.profiles 
                        ? `${contract.profiles.first_name} ${contract.profiles.last_name}`
                        : 'Not assigned'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer Reference Number</p>
                    <p className="font-medium">{contract.customer_reference_number || 'Not set'}</p>
                  </div>
                </div>

                {contract.description && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm mt-1">{contract.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Terms & Installments */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Terms & Installments</CardTitle>
                    <p className="text-sm text-muted-foreground">Manage payment schedule and installments for this contract</p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/contracts/${contract.id}/payment-terms/edit`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Terms
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/contracts/${contract.id}/payment-terms/add`)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Installment
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ContractPaymentTerms 
                  contractId={contract.id} 
                  canEdit={canEdit}
                  onUpdate={fetchContract}
                />
              </CardContent>
            </Card>

            {/* Audit Trail */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <p className="text-sm text-muted-foreground">History of changes and activities</p>
              </CardHeader>
              <CardContent>
                <ContractAuditTrail contractId={contract.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContractDetail;