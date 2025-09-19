import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface SiteStatisticsProps {
  siteId: string;
}

interface Statistics {
  totalContractValue: number;
  totalDealPipelineValue: number;
  totalPaymentsReceived: number;
  activeDealsCount: number;
  signedContractsCount: number;
  leadConversionRate: number;
}

export function SiteStatistics({ siteId }: SiteStatisticsProps) {
  const { currentTenant } = useTenant();
  const [statistics, setStatistics] = useState<Statistics>({
    totalContractValue: 0,
    totalDealPipelineValue: 0,
    totalPaymentsReceived: 0,
    activeDealsCount: 0,
    signedContractsCount: 0,
    leadConversionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant && siteId) {
      fetchStatistics();
    }
  }, [currentTenant, siteId]);

  const fetchStatistics = async () => {
    try {
      // Fetch contracts linked to this site
      const { data: contracts } = await supabase
        .from('contracts')
        .select('value, status')
        .eq('site_id', siteId)
        .eq('tenant_id', currentTenant?.id);

      // Fetch deals linked to this site
      const { data: deals } = await supabase
        .from('deals')
        .select('id, value, status')
        .eq('site_id', siteId)
        .eq('tenant_id', currentTenant?.id);

      // Fetch payment terms for site contracts (only for existing contracts)
      const contractIds = contracts?.map(c => c.id) || [];
      let paymentTerms = [];
      
      if (contractIds.length > 0) {
        const { data: terms } = await supabase
          .from('contract_payment_terms')
          .select(`
            calculated_amount,
            contract_payment_stages(name)
          `)
          .in('contract_id', contractIds)
          .eq('tenant_id', currentTenant?.id);
        
        paymentTerms = terms || [];
      }

      // Calculate statistics
      const totalContractValue = contracts?.reduce((sum, contract) => 
        sum + (contract.value || 0), 0) || 0;

      const totalDealPipelineValue = deals?.filter(deal => 
        deal.status === 'lead' || deal.status === 'qualified' || deal.status === 'proposal')
        .reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;

      const signedContractsCount = contracts?.filter(contract => 
        contract.status === 'active' || contract.status === 'signed').length || 0;

      const activeDealsCount = deals?.filter(deal => 
        deal.status === 'lead' || deal.status === 'qualified' || deal.status === 'proposal').length || 0;

      // Calculate payments received (where stage is "Paid" or "Completed")
      const totalPaymentsReceived = paymentTerms?.filter(term => {
        const stageName = term.contract_payment_stages?.name?.toLowerCase();
        return stageName === 'paid' || stageName === 'completed';
      })?.reduce((sum, term) => sum + (term.calculated_amount || 0), 0) || 0;

      // Simple lead conversion rate calculation
      const totalDeals = deals?.length || 0;
      const convertedDeals = deals?.filter(deal => 
        deal.status === 'won' || contracts?.some(c => c.status === 'active')).length || 0;
      const leadConversionRate = totalDeals > 0 ? (convertedDeals / totalDeals) * 100 : 0;

      setStatistics({
        totalContractValue,
        totalDealPipelineValue,
        totalPaymentsReceived,
        activeDealsCount,
        signedContractsCount,
        leadConversionRate,
      });
    } catch (error) {
      console.error('Error fetching site statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD', // You might want to use the tenant's default currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent className="animate-pulse">
              <div className="h-8 bg-muted rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Contract Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(statistics.totalContractValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            {statistics.signedContractsCount} signed contracts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Deal Pipeline Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(statistics.totalDealPipelineValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            {statistics.activeDealsCount} active deals
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Payments Received</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(statistics.totalPaymentsReceived)}
          </div>
          <p className="text-xs text-muted-foreground">
            From completed payments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.activeDealsCount}</div>
          <p className="text-xs text-muted-foreground">
            In progress
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Signed Contracts</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.signedContractsCount}</div>
          <p className="text-xs text-muted-foreground">
            Active agreements
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {statistics.leadConversionRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Lead to deal conversion
          </p>
        </CardContent>
      </Card>
    </div>
  );
}