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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/contracts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{contract.name}</h1>
              <p className="text-muted-foreground">
                Contract Details and Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(contract.status)}>
              {contract.status}
            </Badge>
            {canEdit && (
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Contract
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Contract Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contract Value</label>
                    <p className="text-lg font-semibold">
                      {formatCurrency(contract.value, contract.currencies)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reference Number</label>
                    <p>{contract.customer_reference_number || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Signed Date</label>
                    <p>{formatDate(contract.signed_date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p>{formatDate(contract.start_date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">End Date</label>
                    <p>{formatDate(contract.end_date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                    <p>
                      {contract.profiles 
                        ? `${contract.profiles.first_name} ${contract.profiles.last_name}`
                        : '-'
                      }
                    </p>
                  </div>
                </div>
                {contract.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1">{contract.description}</p>
                  </div>
                )}
                {contract.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p className="mt-1">{contract.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {contract.customers && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{contract.customers.name}</p>
                </CardContent>
              </Card>
            )}

            {contract.sites && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Site
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{contract.sites.name}</p>
                  <p className="text-sm text-muted-foreground">{contract.sites.address}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Tabs defaultValue="payments" className="w-full">
          <TabsList>
            <TabsTrigger value="payments">Payment Terms</TabsTrigger>
            <TabsTrigger value="todos">To-Do Items</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <ContractPaymentTerms 
              contractId={contract.id} 
              canEdit={canEdit}
              onUpdate={fetchContract}
            />
          </TabsContent>

          <TabsContent value="todos" className="space-y-4">
            <ContractTodos 
              contractId={contract.id} 
              canEdit={canEdit}
              onUpdate={fetchContract}
            />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <ContractAuditTrail contractId={contract.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ContractDetail;