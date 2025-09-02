import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, User, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type TargetRecord = {
  id: string;
  target_level: 'company' | 'branch' | 'department' | 'user';
  entity_id: string | null;
  target_type: 'leads_count' | 'deals_count' | 'deals_value' | 'payments_value';
  target_value: number;
  period_type: 'monthly' | 'quarterly' | 'yearly';
  period_start: string;
  period_end: string;
  active: boolean;
  entity_name?: string;
};

interface TargetHierarchyViewProps {
  targets: TargetRecord[];
}

const TARGET_TYPE_LABELS = {
  leads_count: 'New Leads',
  deals_count: 'Deals Signed',
  deals_value: 'Deals Value',
  payments_value: 'Payments Received'
};

const TARGET_LEVEL_ICONS = {
  company: Building2,
  branch: Building2,
  department: Users,
  user: User
};

export function TargetHierarchyView({ targets }: TargetHierarchyViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedTargetType, setSelectedTargetType] = useState<string>('');

  // Get unique periods and target types
  const uniquePeriods = Array.from(
    new Set(
      targets.map(t => `${t.period_start}_${t.period_end}_${t.period_type}`)
    )
  ).map(key => {
    const [start, end, type] = key.split('_');
    return {
      key,
      label: `${format(new Date(start), 'MMM dd')} - ${format(new Date(end), 'MMM dd, yyyy')} (${type})`,
      start,
      end,
      type
    };
  }).sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());

  const uniqueTargetTypes = Array.from(new Set(targets.map(t => t.target_type)));

  // Filter targets based on selected period and type
  const filteredTargets = targets.filter(target => {
    if (selectedPeriod) {
      const [start, end, type] = selectedPeriod.split('_');
      if (target.period_start !== start || target.period_end !== end || target.period_type !== type) {
        return false;
      }
    }
    if (selectedTargetType && target.target_type !== selectedTargetType) {
      return false;
    }
    return true;
  });

  // Group targets by level and type
  const groupedTargets = filteredTargets.reduce((acc, target) => {
    const key = `${target.target_level}_${target.target_type}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(target);
    return acc;
  }, {} as Record<string, TargetRecord[]>);

  const formatTargetValue = (value: number, type: string) => {
    if (type.includes('value')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    return value.toString();
  };

  const calculateLevelTotal = (level: string, targetType: string) => {
    const levelTargets = filteredTargets.filter(
      t => t.target_level === level && t.target_type === targetType
    );
    return levelTargets.reduce((sum, t) => sum + t.target_value, 0);
  };

  const renderTargetLevel = (level: 'company' | 'branch' | 'department' | 'user', targetType: string) => {
    const levelTargets = filteredTargets.filter(
      t => t.target_level === level && t.target_type === targetType
    );

    if (levelTargets.length === 0) return null;

    const Icon = TARGET_LEVEL_ICONS[level];
    const total = calculateLevelTotal(level, targetType);
    const companyTarget = level !== 'company' ? calculateLevelTotal('company', targetType) : 0;

    return (
      <Card key={`${level}_${targetType}`} className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {level.charAt(0).toUpperCase() + level.slice(1)} Level
              <Badge variant="outline">{TARGET_TYPE_LABELS[targetType as keyof typeof TARGET_TYPE_LABELS]}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {formatTargetValue(total, targetType)}
              </span>
              {level !== 'company' && companyTarget > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {total !== companyTarget && (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span>vs Company: {formatTargetValue(companyTarget, targetType)}</span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {levelTargets.map((target) => (
              <div
                key={target.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {target.entity_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(target.period_start), 'MMM dd')} - {format(new Date(target.period_end), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatTargetValue(target.target_value, target.target_type)}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {target.period_type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Target Hierarchy</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Filter by Period</label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="All periods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All periods</SelectItem>
              {uniquePeriods.map((period) => (
                <SelectItem key={period.key} value={period.key}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Filter by Target Type</label>
          <Select value={selectedTargetType} onValueChange={setSelectedTargetType}>
            <SelectTrigger>
              <SelectValue placeholder="All target types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All target types</SelectItem>
              {uniqueTargetTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {TARGET_TYPE_LABELS[type as keyof typeof TARGET_TYPE_LABELS]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTargets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No targets found for the selected filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">Target Hierarchy Rules</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Company targets may or may not equal the sum of branch/department/user targets. 
                  This flexibility allows for strategic planning where individual targets can be set independently 
                  of higher-level objectives. Warning icons indicate when totals don't match company targets.
                </p>
              </div>
            </div>
          </div>

          {uniqueTargetTypes
            .filter(targetType => 
              selectedTargetType === '' || selectedTargetType === targetType
            )
            .map(targetType => (
              <div key={targetType} className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="text-lg font-semibold text-primary">
                    {TARGET_TYPE_LABELS[targetType as keyof typeof TARGET_TYPE_LABELS]} Targets
                  </h4>
                </div>
                
                {(['company', 'branch', 'department', 'user'] as const).map(level => 
                  renderTargetLevel(level, targetType)
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}