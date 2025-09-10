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
import { 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Clock,
  AlertCircle 
} from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';

export interface PaymentPipelineData {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  expectedAmount: number;
  paidAmount: number;
  pendingCount: number;
  contractPayments: any[];
  dealPayments: any[];
}

type ViewType = 'chart' | 'line' | 'table';
type PeriodType = 'monthly' | 'quarterly' | 'annually';

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

  useEffect(() => {
    if (user && currentTenant) {
      loadPaymentPipelineData();
    }
  }, [user, currentTenant, period, selectedMonth, selectedYear]);

  const loadPaymentPipelineData = async () => {
    try {
      setLoading(true);
      
      // Get the date range based on selected period
      const { startDate, endDate } = getDateRange();
      
      // Load contract payment terms
      const { data: contractPayments, error: contractError } = await supabase
        .from('contract_payment_terms')
        .select(`
          *,
          contracts!inner(
            id,
            name,
            tenant_id,
            assigned_to,
            currencies(symbol)
          )
        `)
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0])
        .eq('contracts.tenant_id', currentTenant.id);

      if (contractError) throw contractError;

      // Load deal payment terms for deals at 90% stage
      const { data: dealPayments, error: dealError } = await supabase
        .from('deal_payment_terms')
        .select(`
          *,
          deals!inner(
            id,
            name,
            tenant_id,
            assigned_to,
            deal_stages!inner(win_percentage),
            currencies(symbol)
          )
        `)
        .eq('installment_number', 1)
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0])
        .eq('deals.tenant_id', currentTenant.id)
        .gte('deals.deal_stages.win_percentage', 90);

      if (dealError) throw dealError;

      // Filter by user permissions - only show data user has access to
      const filteredContractPayments = contractPayments?.filter(payment => {
        const contract = payment.contracts;
        return contract.assigned_to === user.id || isUserAdmin();
      }) || [];

      const filteredDealPayments = dealPayments?.filter(payment => {
        const deal = payment.deals;
        return deal.assigned_to === user.id || isUserAdmin();
      }) || [];

      // Group data by weeks
      const weeklyData = groupPaymentsByWeek(filteredContractPayments, filteredDealPayments, startDate, endDate);
      
      setData(weeklyData);
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

  const groupPaymentsByWeek = (contractPayments: any[], dealPayments: any[], startDate: Date, endDate: Date): PaymentPipelineData[] => {
    const weeks: PaymentPipelineData[] = [];
    const current = new Date(startDate);
    let weekNumber = 1;

    while (current <= endDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (weekEnd > endDate) {
        weekEnd.setTime(endDate.getTime());
      }

      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Filter payments for this week
      const weekContractPayments = contractPayments.filter(payment => 
        payment.due_date >= weekStartStr && payment.due_date <= weekEndStr
      );

      const weekDealPayments = dealPayments.filter(payment => 
        payment.due_date >= weekStartStr && payment.due_date <= weekEndStr
      );

      // Calculate totals
      const contractExpected = weekContractPayments.reduce((sum, p) => sum + (p.calculated_amount || p.amount_value || 0), 0);
      const contractPaid = weekContractPayments.reduce((sum, p) => sum + (p.received_amount || 0), 0);
      
      const dealExpected = weekDealPayments.reduce((sum, p) => sum + (p.calculated_amount || p.amount_value || 0), 0);
      
      const pendingCount = weekContractPayments.filter(p => p.payment_status === 'pending').length +
                          weekDealPayments.filter(p => !p.paid_date).length;

      weeks.push({
        weekNumber,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        expectedAmount: contractExpected + dealExpected,
        paidAmount: contractPaid,
        pendingCount,
        contractPayments: weekContractPayments,
        dealPayments: weekDealPayments
      });

      current.setDate(current.getDate() + 7);
      weekNumber++;
    }

    return weeks;
  };

  const getTotalExpected = () => data.reduce((sum, week) => sum + week.expectedAmount, 0);
  const getTotalPaid = () => data.reduce((sum, week) => sum + week.paidAmount, 0);
  const getTotalPending = () => data.reduce((sum, week) => sum + week.pendingCount, 0);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleWeekClick = (weekData: PaymentPipelineData) => {
    setSelectedWeek(weekData);
    setShowWeekModal(true);
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
        <div className="flex gap-4 items-center">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(getTotalExpected())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(getTotalPaid())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(getTotalExpected() - getTotalPaid())}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getTotalPending()}</div>
          </CardContent>
        </Card>
      </div>

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