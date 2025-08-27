import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, Filter, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { WidgetConfig } from '../DashboardGrid';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, startOfMonth, addWeeks, addMonths, isSameWeek, isSameMonth } from 'date-fns';

interface IncomingPaymentsWidgetProps {
  config: WidgetConfig;
  onUpdateConfig: (updates: Partial<WidgetConfig>) => void;
  customizeMode: boolean;
}

interface PaymentData {
  period: string;
  amount: number;
  deals: Array<{
    id: string;
    name: string;
    amount: number;
    dueDate?: Date;
  }>;
}

export function IncomingPaymentsWidget({ config, onUpdateConfig, customizeMode }: IncomingPaymentsWidgetProps) {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const timeFilter = config.filters?.timeFilter || 'monthly';
  const viewMode = config.filters?.viewMode || 'my'; // 'my' or 'all'

  useEffect(() => {
    if (currentTenant) {
      loadIncomingPayments();
    }
  }, [currentTenant, timeFilter, viewMode]);

  const loadIncomingPayments = async () => {
    try {
      setLoading(true);
      
      // Build base query for deals with 90% probability
      let dealsQuery = supabase
        .from('deals')
        .select(`
          id,
          name,
          value,
          assigned_to,
          expected_close_date,
          currency_id,
          deal_payment_terms (
            installment_number,
            amount_value,
            amount_type,
            calculated_amount,
            due_date
          )
        `)
        .eq('tenant_id', currentTenant?.id)
        .eq('probability', 90)
        .in('status', ['lead', 'proposal', 'negotiation']); // Only active deals

      // Apply user filter if not admin or if admin chose "my" view
      if (!isAdmin || viewMode === 'my') {
        dealsQuery = dealsQuery.eq('assigned_to', user?.id);
      }

      const { data: deals, error } = await dealsQuery;

      if (error) throw error;

      // Process deals to calculate first payment amounts and group by time
      const paymentsMap = new Map<string, PaymentData>();
      const now = new Date();

      deals?.forEach(deal => {
        let firstPaymentAmount = 0;
        let dueDate: Date | undefined;

        // Check if deal has payment terms
        const paymentTerms = deal.deal_payment_terms || [];
        const firstPaymentTerm = paymentTerms
          .filter(term => term.installment_number === 1)
          .sort((a, b) => a.installment_number - b.installment_number)[0];

        if (firstPaymentTerm) {
          // Use calculated amount if available, otherwise calculate based on type
          if (firstPaymentTerm.calculated_amount) {
            firstPaymentAmount = Number(firstPaymentTerm.calculated_amount);
          } else if (firstPaymentTerm.amount_type === 'percentage' && deal.value) {
            firstPaymentAmount = (Number(deal.value) * Number(firstPaymentTerm.amount_value)) / 100;
          } else {
            firstPaymentAmount = Number(firstPaymentTerm.amount_value || 0);
          }
          dueDate = firstPaymentTerm.due_date ? new Date(firstPaymentTerm.due_date) : undefined;
        } else {
          // No payment terms, use full deal value
          firstPaymentAmount = Number(deal.value || 0);
          dueDate = deal.expected_close_date ? new Date(deal.expected_close_date) : undefined;
        }

        // Determine the time period based on due date or expected close date
        const periodDate = dueDate || deal.expected_close_date ? new Date(dueDate || deal.expected_close_date!) : now;
        let periodKey: string;

        if (timeFilter === 'weekly') {
          const weekStart = startOfWeek(periodDate);
          periodKey = format(weekStart, 'MMM dd, yyyy');
        } else {
          const monthStart = startOfMonth(periodDate);
          periodKey = format(monthStart, 'MMM yyyy');
        }

        // Add to payments map
        if (!paymentsMap.has(periodKey)) {
          paymentsMap.set(periodKey, {
            period: periodKey,
            amount: 0,
            deals: []
          });
        }

        const periodData = paymentsMap.get(periodKey)!;
        periodData.amount += firstPaymentAmount;
        periodData.deals.push({
          id: deal.id,
          name: deal.name,
          amount: firstPaymentAmount,
          dueDate
        });
      });

      // Convert map to array and sort by period
      const paymentsArray = Array.from(paymentsMap.values())
        .sort((a, b) => {
          // Sort by the actual date represented by the period
          const dateA = timeFilter === 'weekly' 
            ? new Date(a.period) 
            : new Date(a.period + ' 1');
          const dateB = timeFilter === 'weekly' 
            ? new Date(b.period) 
            : new Date(b.period + ' 1');
          return dateA.getTime() - dateB.getTime();
        });

      setPayments(paymentsArray);
    } catch (error) {
      console.error('Error loading incoming payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeFilter = (newTimeFilter: string) => {
    onUpdateConfig({
      filters: { ...config.filters, timeFilter: newTimeFilter }
    });
  };

  const updateViewMode = (newViewMode: string) => {
    onUpdateConfig({
      filters: { ...config.filters, viewMode: newViewMode }
    });
  };

  const getTotalExpected = () => {
    return payments.reduce((total, period) => total + period.amount, 0);
  };

  const getCurrentPeriodAmount = () => {
    if (payments.length === 0) return 0;
    
    const now = new Date();
    const currentPeriod = payments.find(p => {
      if (timeFilter === 'weekly') {
        return isSameWeek(new Date(p.period), now);
      } else {
        return isSameMonth(new Date(p.period + ' 1'), now);
      }
    });
    
    return currentPeriod?.amount || 0;
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Expected Incoming Payments
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Based on 90% deals - First payment only
          </p>
        </div>
        
        <div className="flex items-center gap-1">
          {(customizeMode || showFilters) && (
            <div className="flex items-center gap-2">
              <Select value={timeFilter} onValueChange={updateTimeFilter}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="view-mode"
                    checked={viewMode === 'all'}
                    onCheckedChange={(checked) => updateViewMode(checked ? 'all' : 'my')}
                  />
                  <Label htmlFor="view-mode" className="text-xs">
                    All
                  </Label>
                </div>
              )}
            </div>
          )}
          
          {!customizeMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigate('/deals')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold">
              ${getCurrentPeriodAmount().toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              This {timeFilter === 'weekly' ? 'week' : 'month'}
            </div>
          </div>
          
          <div>
            <div className="text-lg font-semibold">
              ${getTotalExpected().toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Total expected ({payments.length} periods)
            </div>
          </div>
        </div>
        
        {!customizeMode && (
          <div className="mt-4">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : payments.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Upcoming Periods:
                </div>
                {payments.slice(0, 3).map((period) => (
                  <div
                    key={period.period}
                    className="flex justify-between items-center text-xs cursor-pointer hover:bg-muted/50 p-1 rounded"
                    onClick={() => navigate('/deals')}
                  >
                    <div>
                      <div className="font-medium">{period.period}</div>
                      <div className="text-muted-foreground">
                        {period.deals.length} deal{period.deals.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="font-semibold">
                      ${period.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
                {payments.length > 3 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate('/deals')}
                  >
                    View all {payments.length} periods
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No expected payments found
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}