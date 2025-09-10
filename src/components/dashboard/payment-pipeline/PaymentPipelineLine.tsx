import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PaymentPipelineData } from '../PaymentPipelineDashboard';
import { useCurrency } from '@/hooks/use-currency';

interface PaymentPipelineLineProps {
  data: PaymentPipelineData[];
  onWeekClick?: (weekData: PaymentPipelineData) => void;
}

export function PaymentPipelineLine({ data, onWeekClick }: PaymentPipelineLineProps) {
  const { formatCurrency } = useCurrency();

  const chartData = data.map(week => ({
    week: `Week ${week.weekNumber}`,
    expected: week.expectedAmount,
    paid: week.paidAmount,
    outstanding: week.expectedAmount - week.paidAmount,
    cumulative: data.slice(0, week.weekNumber).reduce((sum, w) => sum + w.paidAmount, 0)
  }));

  const formatTooltip = (value: any, name: string) => {
    return [formatCurrency(value), 
      name === 'expected' ? 'Expected' : 
      name === 'paid' ? 'Paid' : 
      name === 'outstanding' ? 'Outstanding' :
      'Cumulative Paid'];
  };

  const handleLineClick = (clickData: any) => {
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
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} onClick={handleLineClick}>
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
          <Line 
            type="monotone" 
            dataKey="expected" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ r: 4, cursor: 'pointer' }}
            name="Expected"
          />
          <Line 
            type="monotone" 
            dataKey="paid" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ r: 4, cursor: 'pointer' }}
            name="Paid"
          />
          <Line 
            type="monotone" 
            dataKey="cumulative" 
            stroke="#8b5cf6" 
            strokeWidth={2}
            dot={{ r: 4, cursor: 'pointer' }}
            strokeDasharray="5 5"
            name="Cumulative Paid"
          />
          <Line 
            type="monotone" 
            dataKey="outstanding" 
            stroke="#f59e0b" 
            strokeWidth={2}
            dot={{ r: 4, cursor: 'pointer' }}
            name="Outstanding"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}