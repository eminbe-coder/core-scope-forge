import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PaymentPipelineData } from '../PaymentPipelineDashboard';
import { useCurrency } from '@/hooks/use-currency';

interface PaymentPipelineChartProps {
  data: PaymentPipelineData[];
}

export function PaymentPipelineChart({ data }: PaymentPipelineChartProps) {
  const { formatCurrency } = useCurrency();

  const chartData = data.map(week => ({
    week: `Week ${week.weekNumber}`,
    expected: week.expectedAmount,
    paid: week.paidAmount,
    outstanding: week.expectedAmount - week.paidAmount,
    pending: week.pendingCount
  }));

  const formatTooltip = (value: any, name: string) => {
    if (name === 'pending') {
      return [value, 'Pending Items'];
    }
    return [formatCurrency(value), name === 'expected' ? 'Expected' : name === 'paid' ? 'Paid' : 'Outstanding'];
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
          <Bar dataKey="expected" fill="#3b82f6" name="Expected" />
          <Bar dataKey="paid" fill="#10b981" name="Paid" />
          <Bar dataKey="outstanding" fill="#f59e0b" name="Outstanding" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}