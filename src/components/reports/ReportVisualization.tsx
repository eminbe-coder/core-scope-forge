import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ReportVisualizationProps {
  data: any[];
  fields: string[];
  visualizationType: string;
  loading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

export function ReportVisualization({ data, fields, visualizationType, loading }: ReportVisualizationProps) {
  if (loading) {
    return <div className="flex items-center justify-center py-8">Loading...</div>;
  }

  if (data.length === 0 || fields.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data available for visualization</p>
      </div>
    );
  }

  const formatValue = (value: any, field: string) => {
    if (value === null || value === undefined) return '-';
    
    if (field.includes('date') || field.includes('created_at') || field.includes('updated_at')) {
      return new Date(value).toLocaleDateString();
    }
    
    if (field === 'value' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  };

  const getFieldLabel = (field: string) => {
    return field.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const renderTable = () => (
    <div className="overflow-x-auto max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {fields.map((field) => (
              <TableHead key={field} className="min-w-24">
                {getFieldLabel(field)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {fields.map((field) => (
                <TableCell key={field} className="max-w-48 truncate">
                  {formatValue(row[field], field)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderBarChart = () => {
    // Use first field as X-axis and second field as Y-axis
    const xField = fields[0];
    const yField = fields[1] || fields[0];
    
    const chartData = data.slice(0, 10).map(item => ({
      name: String(item[xField]).slice(0, 20),
      value: typeof item[yField] === 'number' ? item[yField] : 1,
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderPieChart = () => {
    // Group data by first field and count occurrences
    const groupField = fields[0];
    const groupedData = data.reduce((acc, item) => {
      const key = String(item[groupField]);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(groupedData)
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.slice(0, 15), value }));

    return (
      <ResponsiveContainer width="100%" height={400}>
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

  const renderKPICards = () => {
    const numericFields = fields.filter(field => 
      data.some(row => typeof row[field] === 'number' && !isNaN(row[field]))
    );

    const getKPIIcon = (index: number) => {
      const icons = [TrendingUp, Users, DollarSign, Target];
      const IconComponent = icons[index % icons.length];
      return <IconComponent className="h-6 w-6" />;
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {numericFields.slice(0, 4).map((field, index) => {
          const values = data.map(row => row[field]).filter(val => typeof val === 'number' && !isNaN(val));
          const total = values.reduce((sum, val) => sum + val, 0);
          const average = values.length > 0 ? total / values.length : 0;
          const max = values.length > 0 ? Math.max(...values) : 0;

          return (
            <Card key={field}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getFieldLabel(field)}
                </CardTitle>
                {getKPIIcon(index)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {field === 'value' ? formatValue(total, field) : total.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Avg: {field === 'value' ? formatValue(average, field) : average.toFixed(1)}</div>
                  <div>Max: {field === 'value' ? formatValue(max, field) : max.toLocaleString()}</div>
                  <div>Count: {values.length}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {numericFields.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No numeric fields available for KPI cards
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {data.length} rows • {getFieldLabel(visualizationType)} view
      </div>
      
      {visualizationType === 'table' && renderTable()}
      {visualizationType === 'bar_chart' && renderBarChart()}
      {visualizationType === 'pie_chart' && renderPieChart()}
      {visualizationType === 'kpi_cards' && renderKPICards()}
    </div>
  );
}