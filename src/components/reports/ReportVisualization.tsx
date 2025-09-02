import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { useCurrency } from '@/hooks/use-currency';

interface ReportVisualizationProps {
  data: any[];
  fields: string[];
  visualizationType: string;
  dataSource: string;
  loading?: boolean;
  queryConfig?: {
    comparison_fields?: string[];
  };
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export function ReportVisualization({ data, fields, visualizationType, dataSource, loading = false, queryConfig = {} }: ReportVisualizationProps) {
  const { formatCurrency } = useCurrency();
  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading...</div>;
  }

  if (data.length === 0 || fields.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <h3 className="text-lg font-medium">No Data</h3>
            <p className="text-muted-foreground">No data available for the selected criteria</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatFieldName = (field: string) => {
    return field.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatValue = (value: any, field: string) => {
    if (value === null || value === undefined) return '-';
    
    // Format currency values
    if (field.includes('value') || field.includes('amount')) {
      if (typeof value === 'number') {
        return formatCurrency(value);
      }
    }
    
    // Format dates
    if (field.includes('date') || field.includes('_at')) {
      if (typeof value === 'string') {
        return new Date(value).toLocaleDateString();
      }
    }
    
    return String(value);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'won':
      case 'completed':
      case 'paid':
        return 'default';
      case 'pending':
      case 'in_progress':
      case 'due':
        return 'secondary';
      case 'cancelled':
      case 'lost':
      case 'overdue':
        return 'destructive';
      case 'draft':
      case 'proposal':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const renderTableVisualization = () => (
    <div className="overflow-auto max-h-96">
      <Table>
        <TableHeader>
          <TableRow>
            {fields.map((field) => (
              <TableHead key={field} className="whitespace-nowrap">
                {formatFieldName(field)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {fields.map((field) => (
                <TableCell key={field} className="whitespace-nowrap">
                  {field.includes('status') || field.includes('stage') ? (
                    <Badge variant={getStatusBadgeVariant(row[field]) as any}>
                      {formatValue(row[field], field)}
                    </Badge>
                  ) : (
                    formatValue(row[field], field)
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderKPICards = () => {
    // Calculate KPIs based on data source
    const kpis = [];

    if (dataSource === 'contracts') {
      const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);
      const activeContracts = data.filter(item => item.status === 'active').length;
      const completedContracts = data.filter(item => item.status === 'completed').length;
      
      kpis.push(
        { label: 'Total Contract Value', value: formatValue(totalValue, 'value'), icon: DollarSign },
        { label: 'Total Contracts', value: data.length, icon: Target },
        { label: 'Active Contracts', value: activeContracts, icon: TrendingUp },
        { label: 'Completed Contracts', value: completedContracts, icon: Users }
      );
    } else if (dataSource === 'contract_payments') {
      const totalAmount = data.reduce((sum, item) => sum + (item.calculated_amount || item.amount_value || 0), 0);
      const duePayments = data.filter(item => item.stage_name === 'Due').length;
      const pendingTodos = data.reduce((sum, item) => sum + (item.todos_count || 0), 0);
      
      kpis.push(
        { label: 'Total Payment Amount', value: formatValue(totalAmount, 'amount'), icon: DollarSign },
        { label: 'Total Payments', value: data.length, icon: Target },
        { label: 'Due Payments', value: duePayments, icon: TrendingUp },
        { label: 'Pending To-Dos', value: pendingTodos, icon: Users }
      );
    } else if (dataSource === 'deals') {
      const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);
      const avgProbability = data.reduce((sum, item) => sum + (item.probability || 0), 0) / data.length;
      const wonDeals = data.filter(item => item.status === 'won').length;
      
      kpis.push(
        { label: 'Total Deal Value', value: formatValue(totalValue, 'value'), icon: DollarSign },
        { label: 'Total Deals', value: data.length, icon: Target },
        { label: 'Won Deals', value: wonDeals, icon: TrendingUp },
        { label: 'Avg Probability', value: `${Math.round(avgProbability)}%`, icon: Users }
      );
    } else {
      kpis.push(
        { label: 'Total Records', value: data.length, icon: Target },
        { label: 'Data Source', value: formatFieldName(dataSource), icon: Users }
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderBarChart = () => {
    // Prepare data for bar chart based on first numeric field found
    const numericField = fields.find(field => 
      field.includes('value') || field.includes('amount') || field.includes('count')
    );
    const labelField = fields.find(field => 
      field.includes('name') || field.includes('status') || field.includes('stage')
    ) || fields[0];

    if (!numericField || !labelField) {
      return <div className="text-center py-8 text-muted-foreground">No suitable fields for bar chart</div>;
    }

    // Group data by label field and sum numeric values
    const chartData = data.reduce((acc: any[], item) => {
      const label = item[labelField] || 'Unknown';
      const value = parseFloat(item[numericField]) || 0;
      
      const existing = acc.find(entry => entry.label === label);
      if (existing) {
        existing.value += value;
      } else {
        acc.push({ label, value });
      }
      
      return acc;
    }, []);

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="hsl(var(--primary))" name={formatFieldName(numericField)} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = () => {
    // Use status or stage field for pie chart
    const categoryField = fields.find(field => 
      field.includes('status') || field.includes('stage') || field.includes('type')
    ) || fields[0];

    if (!categoryField) {
      return <div className="text-center py-8 text-muted-foreground">No suitable fields for pie chart</div>;
    }

    // Count occurrences of each category
    const chartData = data.reduce((acc: any[], item) => {
      const category = item[categoryField] || 'Unknown';
      
      const existing = acc.find(entry => entry.name === category);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: category, value: 1 });
      }
      
      return acc;
    }, []);

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderComparisonChart = () => {
    const comparisonFields = queryConfig?.comparison_fields || [];
    
    if (comparisonFields.length !== 2) {
      return <div className="text-center py-8 text-muted-foreground">Please select exactly 2 fields to compare</div>;
    }

    const [field1, field2] = comparisonFields;
    const field1Label = formatFieldName(field1);
    const field2Label = formatFieldName(field2);

    // Prepare data for comparison chart
    const chartData = data.map((item, index) => ({
      name: item.name || item.entity_name || `Item ${index + 1}`,
      [field1]: parseFloat(item[field1]) || 0,
      [field2]: parseFloat(item[field2]) || 0,
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={field1} fill="hsl(var(--primary))" name={field1Label} />
          <Bar dataKey={field2} fill="hsl(var(--secondary))" name={field2Label} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {formatFieldName(dataSource)} Report - {data.length} records
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visualizationType === 'table' && renderTableVisualization()}
        {visualizationType === 'kpi_cards' && renderKPICards()}
        {visualizationType === 'bar_chart' && renderBarChart()}
        {visualizationType === 'pie_chart' && renderPieChart()}
        {visualizationType === 'comparison_chart' && renderComparisonChart()}
      </CardContent>
    </Card>
  );
}