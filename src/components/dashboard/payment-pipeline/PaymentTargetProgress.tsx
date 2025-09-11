import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useCurrency } from '@/hooks/use-currency';
import { Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

interface PaymentTargetProgressProps {
  filterType: string;
  filterValue: string;
  period: string;
  selectedMonth: number;
  selectedYear: number;
}

interface TargetData {
  id: string;
  target_value: number;
  actual_value: number;
  progress_percentage: number;
  entity_name: string;
  target_type: string;
  status: 'achieved' | 'on-track' | 'behind';
}

export function PaymentTargetProgress({ 
  filterType, 
  filterValue, 
  period, 
  selectedMonth, 
  selectedYear 
}: PaymentTargetProgressProps) {
  const { currentTenant } = useTenant();
  const { formatCurrency } = useCurrency();
  const [targetData, setTargetData] = useState<TargetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      loadTargetProgress();
    }
  }, [currentTenant, filterType, filterValue, period, selectedMonth, selectedYear]);

  const getDateRange = () => {
    let startDate: Date;
    let endDate: Date;

    if (period === 'monthly') {
      startDate = startOfMonth(new Date(selectedYear, selectedMonth, 1));
      endDate = endOfMonth(new Date(selectedYear, selectedMonth, 1));
    } else if (period === 'quarterly') {
      const quarterStart = Math.floor(selectedMonth / 3) * 3;
      startDate = startOfQuarter(new Date(selectedYear, quarterStart, 1));
      endDate = endOfQuarter(new Date(selectedYear, quarterStart, 1));
    } else { // annually
      startDate = startOfYear(new Date(selectedYear, 0, 1));
      endDate = endOfYear(new Date(selectedYear, 0, 1));
    }

    return { startDate, endDate };
  };

  const loadTargetProgress = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      // Load targets based on filter
      let targetLevel: 'company' | 'user' | 'department' | 'branch' = 'company';
      let entityId: string | null = null;

      if (filterType === 'user' && filterValue !== 'all') {
        targetLevel = 'user';
        entityId = filterValue;
      } else if (filterType === 'department' && filterValue !== 'all') {
        targetLevel = 'department';
        entityId = filterValue;
      }

      let targetQuery = supabase
        .from('targets')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('target_type', 'payments_value')
        .eq('target_level', targetLevel)
        .eq('active', true)
        .gte('period_start', format(startDate, 'yyyy-MM-dd'))
        .lte('period_end', format(endDate, 'yyyy-MM-dd'));

      if (entityId) {
        targetQuery = targetQuery.eq('entity_id', entityId);
      } else {
        targetQuery = targetQuery.is('entity_id', null);
      }

      const { data: targets } = await targetQuery.maybeSingle();

      if (!targets) {
        setTargetData(null);
        return;
      }

      // Calculate actual payments received in the period
      let actualQuery = supabase
        .from('contract_payment_terms')
        .select(`
          received_amount,
          contracts!inner(
            tenant_id,
            assigned_to,
            customers(companies(id, name)),
            sites(companies(id, name))
          )
        `)
        .eq('contracts.tenant_id', currentTenant.id)
        .gte('received_date', format(startDate, 'yyyy-MM-dd'))
        .lte('received_date', format(endDate, 'yyyy-MM-dd'))
        .not('received_amount', 'is', null);

      // Apply filters
      if (filterType === 'user' && filterValue !== 'all') {
        actualQuery = actualQuery.eq('contracts.assigned_to', filterValue);
      }

      const { data: payments } = await actualQuery;

      let actualValue = 0;
      if (payments) {
        if (filterType === 'company' && filterValue !== 'all') {
          actualValue = payments
            .filter(p => {
              const companyId = p.contracts?.customers?.companies?.[0]?.id || 
                             p.contracts?.sites?.companies?.[0]?.id;
              return companyId === filterValue;
            })
            .reduce((sum, p) => sum + (p.received_amount || 0), 0);
        } else {
          actualValue = payments.reduce((sum, p) => sum + (p.received_amount || 0), 0);
        }
      }

      const progressPercentage = targets.target_value > 0 
        ? Math.round((actualValue / targets.target_value) * 100)
        : 0;

      let status: 'achieved' | 'on-track' | 'behind' = 'behind';
      if (progressPercentage >= 100) {
        status = 'achieved';
      } else if (progressPercentage >= 75) {
        status = 'on-track';
      }

      // Get entity name
      let entityName = 'Company-wide';
      if (targets.entity_id) {
        if (targetLevel === 'user') {
          const { data: user } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', targets.entity_id)
            .maybeSingle();
          entityName = user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
        } else if (targetLevel === 'department') {
          const { data: dept } = await supabase
            .from('departments')
            .select('name')
            .eq('id', targets.entity_id)
            .maybeSingle();
          entityName = dept?.name || 'Unknown Department';
        }
      }

      setTargetData({
        id: targets.id,
        target_value: targets.target_value,
        actual_value: actualValue,
        progress_percentage: progressPercentage,
        entity_name: entityName,
        target_type: targets.target_type,
        status
      });

    } catch (error) {
      console.error('Error loading target progress:', error);
      setTargetData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved':
        return 'bg-green-500';
      case 'on-track':
        return 'bg-blue-500';
      case 'behind':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved':
        return <Target className="h-4 w-4 text-green-600" />;
      case 'on-track':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'behind':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!targetData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Payment Target Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No payment targets found for the selected period and filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {getStatusIcon(targetData.status)}
          Payment Target Progress - {targetData.entity_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(targetData.actual_value)}</p>
            <p className="text-sm text-muted-foreground">
              of {formatCurrency(targetData.target_value)} target
            </p>
          </div>
          <Badge 
            className={`${getStatusColor(targetData.status)} text-white`}
            variant="secondary"
          >
            {targetData.progress_percentage}% 
            {targetData.status === 'achieved' ? ' Achieved' : 
             targetData.status === 'on-track' ? ' On Track' : ' Behind'}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <Progress 
            value={Math.min(targetData.progress_percentage, 100)} 
            className={`h-3 ${getStatusColor(targetData.status)}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>{targetData.progress_percentage}%</span>
            <span>100%</span>
          </div>
        </div>

        {targetData.progress_percentage >= 100 && (
          <div className="text-sm text-green-600 font-medium">
            🎉 Target achieved! Great work!
          </div>
        )}
      </CardContent>
    </Card>
  );
}