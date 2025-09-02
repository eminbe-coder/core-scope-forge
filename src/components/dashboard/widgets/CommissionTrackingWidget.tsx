import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { DollarSign, TrendingUp, RefreshCw, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface CommissionUser {
  userId: string;
  userName: string;
  totalCommission: number;
  breakdown: {
    configName: string;
    configType: string;
    earned: number;
    basedOnValue: number;
    rate: number;
  }[];
}

interface CommissionData {
  users: CommissionUser[];
  departmentTotals: { [key: string]: number };
  branchTotals: { [key: string]: number };
  companyTotal: number;
}

export function CommissionTrackingWidget() {
  const { currentTenant } = useTenant();
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('user');
  const [currentPeriod, setCurrentPeriod] = useState(() => format(new Date(), 'yyyy-MM'));

  const loadCommissionData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      const periodStart = format(startOfMonth(new Date(currentPeriod + '-01')), 'yyyy-MM-dd');
      const periodEnd = format(endOfMonth(new Date(currentPeriod + '-01')), 'yyyy-MM-dd');

      const { data: commission, error } = await supabase.functions.invoke(
        'calculate-commission-data',
        { 
          body: {
            tenantId: currentTenant.id,
            level: selectedLevel === 'all' ? undefined : selectedLevel,
            periodStart,
            periodEnd
          }
        }
      );

      if (error) throw error;

      setCommissionData(commission.data || null);
    } catch (error) {
      console.error('Error loading commission data:', error);
      setCommissionData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommissionData();
  }, [currentTenant, selectedLevel, currentPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTopEarners = () => {
    if (!commissionData) return [];
    return commissionData.users
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Commission Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const topEarners = getTopEarners();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Commission Tracking
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadCommissionData}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex gap-2 text-xs">
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="User Level" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="user">User Level</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="branch">Branch</SelectItem>
              <SelectItem value="company">Company</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={currentPeriod} onValueChange={setCurrentPeriod}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value={format(new Date(), 'yyyy-MM')}>This Month</SelectItem>
              <SelectItem value={format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM')}>Last Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Company Total Summary */}
        {commissionData && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Commissions</span>
              </div>
              <Badge variant="secondary" className="text-sm">
                {formatCurrency(commissionData.companyTotal)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{commissionData.users.length} earning users</span>
            </div>
          </div>
        )}

        {/* Top Earners */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Top Earners</h4>
          {topEarners.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No commission data found for this period.
            </p>
          ) : (
            topEarners.map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] w-5 h-5 rounded-full p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <span className="text-xs font-medium truncate">{user.userName}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium">{formatCurrency(user.totalCommission)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {user.breakdown.length} source{user.breakdown.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Commission Breakdown Summary */}
        {commissionData && commissionData.users.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">By Commission Type</h4>
            {(() => {
              const typeBreakdown = commissionData.users.reduce((acc, user) => {
                user.breakdown.forEach(item => {
                  if (!acc[item.configName]) {
                    acc[item.configName] = { total: 0, count: 0 };
                  }
                  acc[item.configName].total += item.earned;
                  acc[item.configName].count += 1;
                });
                return acc;
              }, {} as { [key: string]: { total: number; count: number } });

              return Object.entries(typeBreakdown).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{type}</span>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(data.total)}</div>
                    <div className="text-[10px] text-muted-foreground">{data.count} users</div>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}