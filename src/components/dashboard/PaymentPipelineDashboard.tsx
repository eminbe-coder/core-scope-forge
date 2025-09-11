import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';
import { PaymentPipelineChart } from './payment-pipeline/PaymentPipelineChart';
import { PaymentPipelineTable } from './payment-pipeline/PaymentPipelineTable';
import { PaymentPipelineLine } from './payment-pipeline/PaymentPipelineLine';
import { WeeklyInstallmentsModal } from './payment-pipeline/WeeklyInstallmentsModal';
import { PaymentTargetProgress } from './payment-pipeline/PaymentTargetProgress';
import { 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Clock,
  AlertCircle,
  Filter,
  PiggyBank,
  CheckCircle
} from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';

export interface PaymentPipelineData {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  expectedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueAmount: number;
  pendingCount: number;
  contractPayments: any[];
  dealPayments: any[];
}

type ViewType = 'chart' | 'line' | 'table';
type PeriodType = 'monthly' | 'quarterly' | 'annually';
type FilterType = 'all' | 'user' | 'company' | 'department';

interface FilterOption {
  id: string;
  name: string;
}

export function PaymentPipelineDashboard() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { isAdmin } = usePermissions();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaymentPipelineData[]>([]);
  const [viewType, setViewType] = useState<ViewType>('chart');
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<PaymentPipelineData | null>(null);
  const [showWeekModal, setShowWeekModal] = useState(false);
  
  // New filter states
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState<string>('all');
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);

  useEffect(() => {
    if (user && currentTenant) {
      loadFilterOptions();
    }
  }, [user, currentTenant, filterType]);

  useEffect(() => {
    if (user && currentTenant) {
      loadPaymentPipelineData();
    }
  }, [user, currentTenant, period, selectedMonth, selectedYear, filterType, filterValue]);

  const loadFilterOptions = async () => {
    if (!currentTenant) return;

    try {
      if (filterType === 'user') {
        const { data } = await supabase
          .from('profiles')
          .select(`
            id, first_name, last_name,
            user_tenant_memberships!inner(tenant_id, active)
          `)
          .eq('user_tenant_memberships.tenant_id', currentTenant.id)
          .eq('user_tenant_memberships.active', true);
        
        setFilterOptions(data?.map(u => ({ 
          id: u.id, 
          name: `${u.first_name} ${u.last_name}` 
        })) || []);
      } else if (filterType === 'department') {
        const { data } = await supabase
          .from('departments')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name');
        
        setFilterOptions(data?.map(d => ({ id: d.id, name: d.name })) || []);
      } else {
        // For company filter, we don't need sub-options since it's tenant-wide
        setFilterOptions([]);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
      setFilterOptions([]);
    }
  };

  const loadPaymentPipelineData = async () => {
    try {
      setLoading(true);
      
      // Get the date range based on selected period
      const { startDate, endDate } = getDateRange();
      
      // Build the query with filter conditions
      let contractQuery = supabase
        .from('contract_payment_terms')
        .select(`
          *,
          contracts!inner(
            id,
            name,
            tenant_id,
            assigned_to,
            customer_id,
            site_id,
            currencies(symbol)
          ),
          contract_payment_stages(name)
        `)
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0])
        .eq('contracts.tenant_id', currentTenant.id);

      let dealQuery = supabase
        .from('deal_payment_terms')
        .select(`
          *,
          deals!inner(
            id,
            name,
            tenant_id,
            assigned_to,
            customer_id,
            site_id,
            deal_stages!inner(win_percentage),
            currencies(symbol)
          )
        `)
        .eq('installment_number', 1)
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0])
        .eq('deals.tenant_id', currentTenant.id)
        .gte('deals.deal_stages.win_percentage', 90);

      // Apply filters
      if (filterType === 'user' && filterValue !== 'all') {
        contractQuery = contractQuery.eq('contracts.assigned_to', filterValue);
        dealQuery = dealQuery.eq('deals.assigned_to', filterValue);
      }
      // Company filter is handled by tenant_id constraint (already applied above)
      // Department filter would need user-department relationship (not implemented yet)

      const [contractResult, dealResult] = await Promise.all([
        contractQuery,
        dealQuery
      ]);

      if (contractResult.error) throw contractResult.error;
      if (dealResult.error) throw dealResult.error;

      // Filter by permissions - for company filter, show all tenant data
      let filteredContractPayments = contractResult.data?.filter(payment => {
        const contract = payment.contracts;
        
        // For company filter, show all tenant data (no permission restriction)
        if (filterType === 'company') {
          return true;
        }
        
        // For user/department filters, apply permission check
        const hasPermission = contract.assigned_to === user.id || isUserAdmin();
        return hasPermission;
      }) || [];

      let filteredDealPayments = dealResult.data?.filter(payment => {
        const deal = payment.deals;
        
        // For company filter, show all tenant data (no permission restriction)
        if (filterType === 'company') {
          return true;
        }
        
        // For user/department filters, apply permission check
        const hasPermission = deal.assigned_to === user.id || isUserAdmin();
        return hasPermission;
      }) || [];

      // Group data by weeks/months/quarters based on period
      const periodData = groupPaymentsByPeriod(filteredContractPayments, filteredDealPayments, startDate, endDate);
      
      setData(periodData);
    } catch (error) {
      console.error('Error loading payment pipeline data:', error);
      toast.error('Failed to load payment pipeline data');
    } finally {
      setLoading(false);
    }
  };

  const isUserAdmin = () => {
    return isAdmin;
  };

  const getDateRange = () => {
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'monthly':
        startDate = new Date(selectedYear, selectedMonth, 1);
        endDate = new Date(selectedYear, selectedMonth + 1, 0);
        break;
      case 'quarterly':
        const quarterStart = Math.floor(selectedMonth / 3) * 3;
        startDate = new Date(selectedYear, quarterStart, 1);
        endDate = new Date(selectedYear, quarterStart + 3, 0);
        break;
      case 'annually':
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31);
        break;
      default:
        startDate = new Date(selectedYear, selectedMonth, 1);
        endDate = new Date(selectedYear, selectedMonth + 1, 0);
    }

    return { startDate, endDate };
  };

  const groupPaymentsByPeriod = (contractPayments: any[], dealPayments: any[], startDate: Date, endDate: Date): PaymentPipelineData[] => {
    const periods: PaymentPipelineData[] = [];
    const current = new Date(startDate);
    let periodNumber = 1;

    while (current <= endDate) {
      let periodStart: Date, periodEnd: Date;
      
      if (period === 'monthly') {
        periodStart = new Date(current.getFullYear(), current.getMonth(), 1);
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        current.setMonth(current.getMonth() + 1);
      } else if (period === 'quarterly') {
        const quarterStart = Math.floor(current.getMonth() / 3) * 3;
        periodStart = new Date(current.getFullYear(), quarterStart, 1);
        periodEnd = new Date(current.getFullYear(), quarterStart + 3, 0);
        current.setMonth(current.getMonth() + 3);
      } else { // annually
        periodStart = new Date(current.getFullYear(), 0, 1);
        periodEnd = new Date(current.getFullYear(), 11, 31);
        current.setFullYear(current.getFullYear() + 1);
      }
      
      if (periodEnd > endDate) {
        periodEnd = new Date(endDate);
      }

      const periodStartStr = periodStart.toISOString().split('T')[0];
      const periodEndStr = periodEnd.toISOString().split('T')[0];

      // Filter payments for this period
      const periodContractPayments = contractPayments.filter(payment => 
        payment.due_date >= periodStartStr && payment.due_date <= periodEndStr
      );

      const periodDealPayments = dealPayments.filter(payment => 
        payment.due_date >= periodStartStr && payment.due_date <= periodEndStr
      );

      // Calculate totals based on new requirements
      const contractExpected = periodContractPayments.reduce((sum, p) => sum + (p.calculated_amount || p.amount_value || 0), 0);
      const contractPaid = periodContractPayments.reduce((sum, p) => sum + (p.received_amount || 0), 0);
      
      const dealExpected = periodDealPayments.reduce((sum, p) => sum + (p.calculated_amount || p.amount_value || 0), 0);
      
      // Calculate pending and due amounts
      const contractPending = periodContractPayments
        .filter(p => p.contract_payment_stages?.name === 'Pending' || (!p.contract_payment_stages && !p.received_amount))
        .reduce((sum, p) => sum + (p.calculated_amount || p.amount_value || 0), 0);
      
      const contractDue = periodContractPayments
        .filter(p => p.contract_payment_stages?.name === 'Due')
        .reduce((sum, p) => sum + (p.calculated_amount || p.amount_value || 0), 0);
      
      const dealPending = dealPayments.filter(p => !p.paid_date)
        .reduce((sum, p) => sum + (p.calculated_amount || p.amount_value || 0), 0);
      
      const pendingCount = periodContractPayments.filter(p => 
        p.contract_payment_stages?.name === 'Pending' || 
        (!p.contract_payment_stages && !p.received_amount)
      ).length + periodDealPayments.filter(p => !p.paid_date).length;

      periods.push({
        weekNumber: periodNumber,
        weekStart: periodStartStr,
        weekEnd: periodEndStr,
        expectedAmount: contractExpected + dealExpected,
        paidAmount: contractPaid,
        pendingAmount: contractPending + dealPending,
        dueAmount: contractDue,
        pendingCount,
        contractPayments: periodContractPayments,
        dealPayments: periodDealPayments
      });

      periodNumber++;
      
      if (current > endDate) break;
    }

    return periods;
  };

  const getTotalExpected = () => data.reduce((sum, period) => sum + period.expectedAmount, 0);
  const getTotalPaid = () => data.reduce((sum, period) => sum + period.paidAmount, 0);
  const getTotalPending = () => data.reduce((sum, period) => sum + period.pendingCount, 0);
  const getTotalPendingAmount = () => data.reduce((sum, period) => sum + period.pendingAmount, 0);
  const getTotalDueAmount = () => data.reduce((sum, period) => sum + period.dueAmount, 0);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleWeekClick = (weekData: PaymentPipelineData) => {
    setSelectedWeek(weekData);
    setShowWeekModal(true);
  };

  const handleFilterTypeChange = (newFilterType: FilterType) => {
    setFilterType(newFilterType);
    setFilterValue('all');
    setFilterOptions([]);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 items-center flex-wrap">
          {/* Filter Control */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={handleFilterTypeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="department">Department</SelectItem>
              </SelectContent>
            </Select>
            
            {filterType !== 'all' && filterType !== 'company' && (
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={`Select ${filterType}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {filterType}s</SelectItem>
                  {filterOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Period Control */}
          <Select value={period} onValueChange={(value: PeriodType) => setPeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>

          {period === 'monthly' && (
            <>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <Button onClick={loadPaymentPipelineData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(getTotalExpected())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatCurrency(getTotalPaid())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{formatCurrency(getTotalExpected() - getTotalPaid())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{getTotalPending()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Installments</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-600">{formatCurrency(getTotalPendingAmount())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(getTotalDueAmount())}</div>
          </CardContent>
        </Card>
      </div>

      {/* Target Progress Bar */}
      <PaymentTargetProgress 
        filterType={filterType}
        filterValue={filterValue}
        period={period}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      {/* Data Views */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Pipeline</CardTitle>
            <Tabs value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
              <TabsList>
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="line">Line</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {viewType === 'chart' && <PaymentPipelineChart data={data} onWeekClick={handleWeekClick} />}
          {viewType === 'line' && <PaymentPipelineLine data={data} onWeekClick={handleWeekClick} />}
          {viewType === 'table' && <PaymentPipelineTable data={data} onWeekClick={handleWeekClick} />}
        </CardContent>
      </Card>

      {/* Weekly Installments Modal */}
      <WeeklyInstallmentsModal
        isOpen={showWeekModal}
        onClose={() => setShowWeekModal(false)}
        weekData={selectedWeek}
      />
    </div>
  );
}