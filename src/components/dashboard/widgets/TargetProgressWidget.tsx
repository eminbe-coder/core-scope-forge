import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Target, TrendingUp, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface TargetProgress {
  id: string;
  target_level: string;
  target_type: string;
  target_value: number;
  actualValue: number;
  progressPercentage: number;
  entityName: string;
  status: 'achieved' | 'on-track' | 'behind';
  period_start: string;
  period_end: string;
}

export function TargetProgressWidget() {
  const { currentTenant } = useTenant();
  const [targets, setTargets] = useState<TargetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [currentPeriod, setCurrentPeriod] = useState(() => format(new Date(), 'yyyy-MM'));

  const loadTargetProgress = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      const periodStart = format(startOfMonth(new Date(currentPeriod + '-01')), 'yyyy-MM-dd');
      const periodEnd = format(endOfMonth(new Date(currentPeriod + '-01')), 'yyyy-MM-dd');

      const requestBody: any = {
        tenantId: currentTenant.id,
        periodStart,
        periodEnd
      };

      if (selectedLevel !== 'all') {
        requestBody.level = selectedLevel;
      }

      const { data: progressData, error } = await supabase.functions.invoke(
        'calculate-target-progress',
        { body: requestBody }
      );

      if (error) throw error;

      setTargets(progressData.data || []);
    } catch (error) {
      console.error('Error loading target progress:', error);
      setTargets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTargetProgress();
  }, [currentTenant, selectedLevel, currentPeriod]);

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

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'achieved':
        return 'default';
      case 'on-track':
        return 'secondary';
      case 'behind':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatValue = (value: number, type: string) => {
    if (type.includes('value')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value);
    }
    return Math.round(value).toString();
  };

  const getTargetTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'leads_count': 'New Leads',
      'deals_count': 'Deals Closed',
      'deals_value': 'Deal Value',
      'payments_value': 'Payments'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Target Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Target Progress
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadTargetProgress}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex gap-2 text-xs">
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="branch">Branch</SelectItem>
              <SelectItem value="department">Department</SelectItem>
              <SelectItem value="user">User</SelectItem>
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
      
      <CardContent className="space-y-3">
        {targets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No targets found for the selected filters.
          </p>
        ) : (
          targets.slice(0, 6).map((target) => (
            <div key={target.id} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(target.status)} className="text-[10px] px-1 py-0">
                    {target.status.toUpperCase()}
                  </Badge>
                  <span className="font-medium truncate">{target.entityName}</span>
                </div>
                <span className="text-muted-foreground">
                  {getTargetTypeLabel(target.target_type)}
                </span>
              </div>
              
              <div className="space-y-1">
                <Progress 
                  value={Math.min(target.progressPercentage, 100)} 
                  className="h-2" 
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {formatValue(target.actualValue, target.target_type)} / {formatValue(target.target_value, target.target_type)}
                  </span>
                  <span>{target.progressPercentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {targets.length > 6 && (
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            +{targets.length - 6} more targets
          </p>
        )}
      </CardContent>
    </Card>
  );
}