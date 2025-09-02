import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { DollarSign, Download, RefreshCw, Filter, TrendingUp, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export function CommissionReport() {
  const { currentTenant } = useTenant();
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    level: 'user',
    periodStart: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    periodEnd: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const loadCommissionData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);

      const { data: commission, error } = await supabase.functions.invoke(
        'calculate-commission-data',
        { 
          body: {
            tenantId: currentTenant.id,
            level: filters.level === 'all' ? undefined : filters.level,
            periodStart: filters.periodStart,
            periodEnd: filters.periodEnd
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
  }, [currentTenant]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const exportData = () => {
    if (!commissionData) return;

    const csvContent = [
      ['User', 'Total Commission', 'Commission Types', 'Breakdown'],
      ...commissionData.users.map(user => [
        user.userName,
        user.totalCommission,
        user.breakdown.length,
        user.breakdown.map(b => `${b.configName}: ${formatCurrency(b.earned)}`).join('; ')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const topEarnersData = commissionData?.users
    ?.sort((a, b) => b.totalCommission - a.totalCommission)
    .slice(0, 10)
    .map(user => ({
      name: user.userName.split(' ').map(n => n[0]).join(''), // Initials for chart
      fullName: user.userName,
      commission: user.totalCommission
    })) || [];

  // Commission type breakdown
  const commissionTypeBreakdown = commissionData?.users.reduce((acc, user) => {
    user.breakdown.forEach(item => {
      if (!acc[item.configName]) {
        acc[item.configName] = 0;
      }
      acc[item.configName] += item.earned;
    });
    return acc;
  }, {} as { [key: string]: number }) || {};

  const pieData = Object.entries(commissionTypeBreakdown).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Commission Report
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportData} disabled={!commissionData}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={loadCommissionData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Report Level</Label>
              <Select value={filters.level} onValueChange={(value) => handleFilterChange('level', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="user">Individual Users</SelectItem>
                  <SelectItem value="department">By Department</SelectItem>
                  <SelectItem value="branch">By Branch</SelectItem>
                  <SelectItem value="company">Company Total</SelectItem>
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

            <div className="md:col-span-3">
              <Button onClick={loadCommissionData} disabled={loading} className="w-full md:w-auto">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          {commissionData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Commissions</p>
                      <p className="text-2xl font-bold">{formatCurrency(commissionData.companyTotal)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Earning Users</p>
                      <p className="text-2xl font-bold">{commissionData.users.filter(u => u.totalCommission > 0).length}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Commission</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(commissionData.users.length > 0 ? commissionData.companyTotal / commissionData.users.length : 0)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          {commissionData && commissionData.users.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Commission Earners</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topEarnersData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={12}
                        tick={{ fill: 'hsl(var(--foreground))' }}
                      />
                      <YAxis 
                        fontSize={12} 
                        tick={{ fill: 'hsl(var(--foreground))' }}
                        tickFormatter={(value) => `$${Math.round(value)}`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                        formatter={(value: number, name: string, props) => [
                          formatCurrency(value), 
                          `${props.payload?.fullName || 'Commission'}`
                        ]}
                      />
                      <Bar dataKey="commission" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {pieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Commission by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Commission Data</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : !commissionData || commissionData.users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No commission data found for the selected period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Total Commission</TableHead>
                        <TableHead>Commission Sources</TableHead>
                        <TableHead>Top Earning Type</TableHead>
                        <TableHead>Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionData.users
                        .sort((a, b) => b.totalCommission - a.totalCommission)
                        .map((user) => {
                          const topEarning = user.breakdown.sort((a, b) => b.earned - a.earned)[0];
                          const performanceLevel = user.totalCommission >= commissionData.companyTotal / commissionData.users.length ? 'above' : 'below';
                          
                          return (
                            <TableRow key={user.userId}>
                              <TableCell className="font-medium">{user.userName}</TableCell>
                              <TableCell className="font-mono">{formatCurrency(user.totalCommission)}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {user.breakdown.map((item, index) => (
                                    <div key={index} className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">{item.configName}:</span>
                                      <span className="font-medium">{formatCurrency(item.earned)}</span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                {topEarning ? (
                                  <div className="text-sm">
                                    <div className="font-medium">{topEarning.configName}</div>
                                    <div className="text-muted-foreground">{formatCurrency(topEarning.earned)}</div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={performanceLevel === 'above' ? 'default' : 'secondary'}>
                                  {performanceLevel === 'above' ? 'Above Average' : 'Below Average'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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