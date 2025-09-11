import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PaymentPipelineData } from '../PaymentPipelineDashboard';
import { useCurrency } from '@/hooks/use-currency';

interface PaymentPipelineChartProps {
  data: PaymentPipelineData[];
  onWeekClick?: (weekData: PaymentPipelineData) => void;
}

export function PaymentPipelineChart({ data, onWeekClick }: PaymentPipelineChartProps) {
  const { formatCurrency } = useCurrency();

  const chartData = data.map(week => ({
    week: `Week ${week.weekNumber}`,
    pending: week.pendingAmount,
    due: week.dueAmount,
    expected: week.expectedAmount,
    pendingCount: week.pendingCount
  }));

  const formatTooltip = (value: any, name: string) => {
    if (name === 'pendingCount') {
      return [value, 'Pending Items'];
    }
    return [formatCurrency(value), 
      name === 'pending' ? 'Pending' : 
      name === 'due' ? 'Due' : 
      'Total Expected'];
  };

  const handleBarClick = (clickData: any) => {
    if (onWeekClick && clickData && clickData.activePayload && clickData.activePayload[0]) {
      const weekNumber = clickData.activePayload[0].payload.week.replace('Week ', '');
      const originalWeekData = data.find(w => w.weekNumber === parseInt(weekNumber));
      if (originalWeekData) {
        onWeekClick(originalWeekData);
      }
    }
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} onClick={handleBarClick}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="week" 
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={formatTooltip} />
          <Legend />
          <Bar dataKey="pending" fill="#eab308" name="Pending" style={{ cursor: 'pointer' }} />
          <Bar dataKey="due" fill="#3b82f6" name="Due" style={{ cursor: 'pointer' }} />
          <Bar dataKey="expected" fill="#10b981" name="Total Expected" style={{ cursor: 'pointer' }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}