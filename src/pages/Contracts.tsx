import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Calendar, DollarSign, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { usePersistentFilters } from '@/hooks/use-persistent-filters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  
  // Persistent filters for contracts
  interface ContractFilters {
    searchTerm: string;
    statusFilter: string;
  }
  const defaultContractFilters: ContractFilters = {
    searchTerm: '',
    statusFilter: 'all',
  };
  const [contractFilters, setContractFilters, clearContractFilters] = usePersistentFilters<ContractFilters>('contracts', defaultContractFilters);
  
  const searchTerm = contractFilters.searchTerm;
  const statusFilter = contractFilters.statusFilter;
  
  const setSearchTerm = (value: string) => setContractFilters(prev => ({ ...prev, searchTerm: value }));
  const setStatusFilter = (value: string) => setContractFilters(prev => ({ ...prev, statusFilter: value }));

  // Filter contracts based on search and status
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = !searchTerm || 
      contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
        .is('deleted_at', null)
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

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {(searchTerm || statusFilter !== 'all') && (
            <Button variant="ghost" size="icon" onClick={clearContractFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {contracts.length === 0 ? 'No contracts yet' : 'No contracts match your filters'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {contracts.length === 0 
                  ? 'Create your first contract to get started' 
                  : 'Try adjusting your search or filter criteria'}
              </p>
              {contracts.length === 0 && (
                <Button onClick={() => navigate('/contracts/add')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Contract
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredContracts.map((contract) => (
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