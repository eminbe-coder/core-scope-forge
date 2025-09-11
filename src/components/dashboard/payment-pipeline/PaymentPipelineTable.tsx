import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PaymentPipelineData } from '../PaymentPipelineDashboard';
import { useCurrency } from '@/hooks/use-currency';
import { format } from 'date-fns';

interface PaymentPipelineTableProps {
  data: PaymentPipelineData[];
  onWeekClick?: (weekData: PaymentPipelineData) => void;
}

export function PaymentPipelineTable({ data, onWeekClick }: PaymentPipelineTableProps) {
  const { formatCurrency } = useCurrency();

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd');
    } catch {
      return dateString;
    }
  };

  const getPaymentRatio = (paid: number, expected: number) => {
    if (expected === 0) return 0;
    return Math.round((paid / expected) * 100);
  };

  const getStatusColor = (ratio: number) => {
    if (ratio >= 100) return 'bg-green-500';
    if (ratio >= 75) return 'bg-blue-500';
    if (ratio >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Outstanding</TableHead>
            <TableHead>Pending Amount</TableHead>
            <TableHead>Due Amount</TableHead>
            <TableHead>Payment Ratio</TableHead>
            <TableHead>Pending Items</TableHead>
            <TableHead>Sources</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((week) => {
            const ratio = getPaymentRatio(week.paidAmount, week.expectedAmount);
            const outstanding = week.expectedAmount - week.paidAmount;
            
            return (
              <TableRow 
                key={week.weekNumber} 
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => onWeekClick?.(week)}
              >
                <TableCell className="font-medium">Week {week.weekNumber}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{formatDate(week.weekStart)}</div>
                    <div className="text-muted-foreground">to {formatDate(week.weekEnd)}</div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(week.expectedAmount)}
                </TableCell>
                <TableCell className="text-green-600 font-medium">
                  {formatCurrency(week.paidAmount)}
                </TableCell>
                <TableCell className="text-orange-600 font-medium">
                  {formatCurrency(outstanding)}
                </TableCell>
                <TableCell className="text-yellow-600 font-medium">
                  {formatCurrency(week.pendingAmount)}
                </TableCell>
                <TableCell className="text-blue-600 font-medium">
                  {formatCurrency(week.dueAmount)}
                </TableCell>
                <TableCell>
                  <Badge className={`text-white ${getStatusColor(ratio)}`}>
                    {ratio}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-red-600 border-red-600">
                    {week.pendingCount} items
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-1">
                    {week.contractPayments.length > 0 && (
                      <div>
                        <Badge variant="secondary" className="mr-1">Contract</Badge>
                        {week.contractPayments.length} payments
                      </div>
                    )}
                    {week.dealPayments.length > 0 && (
                      <div>
                        <Badge variant="secondary" className="mr-1">Deal</Badge>
                        {week.dealPayments.length} payments
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          
          {/* Total Row */}
          <TableRow className="font-bold border-t-2">
            <TableCell>Total</TableCell>
            <TableCell>-</TableCell>
            <TableCell>
              {formatCurrency(data.reduce((sum, week) => sum + week.expectedAmount, 0))}
            </TableCell>
            <TableCell className="text-green-600">
              {formatCurrency(data.reduce((sum, week) => sum + week.paidAmount, 0))}
            </TableCell>
            <TableCell className="text-orange-600">
              {formatCurrency(data.reduce((sum, week) => sum + (week.expectedAmount - week.paidAmount), 0))}
            </TableCell>
            <TableCell className="text-yellow-600">
              {formatCurrency(data.reduce((sum, week) => sum + week.pendingAmount, 0))}
            </TableCell>
            <TableCell className="text-blue-600">
              {formatCurrency(data.reduce((sum, week) => sum + week.dueAmount, 0))}
            </TableCell>
            <TableCell>
              <Badge className={`text-white ${getStatusColor(
                getPaymentRatio(
                  data.reduce((sum, week) => sum + week.paidAmount, 0),
                  data.reduce((sum, week) => sum + week.expectedAmount, 0)
                )
              )}`}>
                {getPaymentRatio(
                  data.reduce((sum, week) => sum + week.paidAmount, 0),
                  data.reduce((sum, week) => sum + week.expectedAmount, 0)
                )}%
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-red-600 border-red-600">
                {data.reduce((sum, week) => sum + week.pendingCount, 0)} items
              </Badge>
            </TableCell>
            <TableCell>-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}