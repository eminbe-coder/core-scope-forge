import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Contract {
  id: string;
  name: string;
  description?: string;
  value?: number;
  status: string;
  signed_date?: string;
  start_date?: string;
  end_date?: string;
  customer_id?: string;
  created_at: string;
  customers?: {
    name: string;
  } | null;
  currencies?: {
    code: string;
    symbol: string;
  } | null;
}

const Contracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTenant } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentTenant?.id) {
      fetchContracts();
    }
  }, [currentTenant?.id]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (name),
          currencies (code, symbol)
        `)
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data as unknown as Contract[] || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
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

  const formatCurrency = (amount?: number, currency?: { code: string; symbol: string }) => {
    if (!amount || !currency) return '-';
    return `${currency.symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Contracts</h1>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Contracts</h1>
            <p className="text-muted-foreground">
              Manage finalized deals and signed agreements
            </p>
          </div>
          <Button onClick={() => navigate('/contracts/add')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Contract
          </Button>
        </div>

        {contracts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No contracts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first contract to get started
              </p>
              <Button onClick={() => navigate('/contracts/add')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Contract
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {contracts.map((contract) => (
              <Card 
                key={contract.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/contracts/${contract.id}`)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{contract.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {contract.customers?.name || 'No customer assigned'}
                      </p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(contract.status)}>
                      {contract.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Value</p>
                        <p className="font-medium">
                          {formatCurrency(contract.value, contract.currencies)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Signed Date</p>
                        <p className="font-medium">{formatDate(contract.signed_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <p className="font-medium">{formatDate(contract.end_date)}</p>
                      </div>
                    </div>
                  </div>
                  {contract.description && (
                    <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                      {contract.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Contracts;