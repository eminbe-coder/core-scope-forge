import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useCurrency } from '@/hooks/use-currency';
import { Target, Download, RefreshCw, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

const COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#6b7280'];

export function TargetProgressReport() {
  const { currentTenant } = useTenant();
  const { formatCurrency } = useCurrency();
  const [targets, setTargets] = useState<TargetProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    level: 'all',
    type: 'all',
    periodStart: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    periodEnd: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const loadTargetProgress = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);

      const requestBody: any = {
        tenantId: currentTenant.id,
        periodStart: filters.periodStart,
        periodEnd: filters.periodEnd
      };

      if (filters.level !== 'all') requestBody.level = filters.level;

      const { data: progressData, error } = await supabase.functions.invoke(
        'calculate-target-progress',
        { body: requestBody }
      );

      if (error) throw error;

      let filteredTargets = progressData.data || [];
      
      if (filters.type !== 'all') {
        filteredTargets = filteredTargets.filter((t: TargetProgress) => t.target_type === filters.type);
      }

      setTargets(filteredTargets);
    } catch (error) {
      console.error('Error loading target progress:', error);
      setTargets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTargetProgress();
  }, [currentTenant]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatValue = (value: number, type: string) => {
    if (type.includes('value')) {
      return formatCurrency(value, 0);
    }
    return Math.round(value).toString();
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'achieved': return 'default';
      case 'on-track': return 'secondary';
      case 'behind': return 'destructive';
      default: return 'outline';
    }
  };

  // Prepare chart data
  const chartData = targets.map(target => ({
    name: target.entityName,
    target: target.target_value,
    actual: target.actualValue,
    percentage: target.progressPercentage,
    status: target.status
  }));

  const statusDistribution = [
    { name: 'Achieved', value: targets.filter(t => t.status === 'achieved').length, color: '#22c55e' },
    { name: 'On Track', value: targets.filter(t => t.status === 'on-track').length, color: '#3b82f6' },
    { name: 'Behind', value: targets.filter(t => t.status === 'behind').length, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const exportData = () => {
    const csvContent = [
      ['Entity', 'Level', 'Type', 'Target', 'Actual', 'Progress %', 'Status', 'Period'],
      ...targets.map(t => [
        t.entityName,
        t.target_level,
        t.target_type,
        t.target_value,
        t.actualValue,
        t.progressPercentage,
        t.status,
        `${t.period_start} to ${t.period_end}`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `target-progress-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Target Progress Report
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportData} disabled={targets.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={loadTargetProgress} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Target Level</Label>
              <Select value={filters.level} onValueChange={(value) => handleFilterChange('level', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Type</Label>
              <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="leads_count">New Leads</SelectItem>
                  <SelectItem value="deals_count">Deals Closed</SelectItem>
                  <SelectItem value="deals_value">Deal Value</SelectItem>
                  <SelectItem value="payments_value">Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period Start</Label>
              <Input
                type="date"
                value={filters.periodStart}
                onChange={(e) => handleFilterChange('periodStart', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Period End</Label>
              <Input
                type="date"
                value={filters.periodEnd}
                onChange={(e) => handleFilterChange('periodEnd', e.target.value)}
              />
            </div>

            <div className="md:col-span-4">
              <Button onClick={loadTargetProgress} disabled={loading} className="w-full md:w-auto">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Charts */}
          {targets.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Target vs Actual Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis fontSize={12} tick={{ fill: 'hsl(var(--foreground))' }} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="target" fill="hsl(var(--muted))" name="Target" />
                      <Bar dataKey="actual" fill="hsl(var(--primary))" name="Actual" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Progress Data</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : targets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No target data found for the selected filters.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {targets.map((target) => (
                        <TableRow key={target.id}>
                          <TableCell className="font-medium">{target.entityName}</TableCell>
                          <TableCell className="capitalize">{target.target_level}</TableCell>
                          <TableCell>{target.target_type.replace('_', ' ')}</TableCell>
                          <TableCell>{formatValue(target.target_value, target.target_type)}</TableCell>
                          <TableCell>{formatValue(target.actualValue, target.target_type)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Progress value={Math.min(target.progressPercentage, 100)} className="h-2" />
                              <span className="text-xs text-muted-foreground">
                                {target.progressPercentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(target.status)}>
                              {target.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(target.period_start), 'MMM dd')} - {format(new Date(target.period_end), 'MMM dd')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}