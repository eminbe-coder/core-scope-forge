import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentPipelineData } from '../PaymentPipelineDashboard';
import { useCurrency } from '@/hooks/use-currency';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

interface WeeklyInstallmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekData: PaymentPipelineData | null;
}

export function WeeklyInstallmentsModal({ isOpen, onClose, weekData }: WeeklyInstallmentsModalProps) {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  if (!weekData) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleInstallmentClick = (installment: any, type: 'contract' | 'deal') => {
    if (type === 'contract') {
      navigate(`/installment-detail/${installment.id}`);
    } else {
      // For deal payments, you might want to navigate to deal detail
      navigate(`/deals/${installment.deal_id}`);
    }
    onClose();
  };

  const getStatusBadge = (installment: any, type: 'contract' | 'deal') => {
    if (type === 'contract') {
      const status = installment.payment_status || 'pending';
      const colors = {
        pending: 'bg-yellow-500',
        paid: 'bg-green-500',
        overdue: 'bg-red-500',
        partial: 'bg-blue-500'
      };
      return (
        <Badge className={`text-white ${colors[status as keyof typeof colors] || 'bg-gray-500'}`}>
          {status}
        </Badge>
      );
    } else {
      return (
        <Badge className={`text-white ${installment.paid_date ? 'bg-green-500' : 'bg-yellow-500'}`}>
          {installment.paid_date ? 'Paid' : 'Pending'}
        </Badge>
      );
    }
  };

  const allInstallments = [
    ...weekData.contractPayments.map(p => ({ ...p, type: 'contract' as const })),
    ...weekData.dealPayments.map(p => ({ ...p, type: 'deal' as const }))
  ].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            Week {weekData.weekNumber} Installments
            <div className="text-sm text-muted-foreground font-normal mt-1">
              {formatDate(weekData.weekStart)} - {formatDate(weekData.weekEnd)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Expected Amount</div>
              <div className="text-lg font-semibold">{formatCurrency(weekData.expectedAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Paid Amount</div>
              <div className="text-lg font-semibold text-green-600">{formatCurrency(weekData.paidAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Pending Items</div>
              <div className="text-lg font-semibold text-red-600">{weekData.pendingCount}</div>
            </div>
          </div>

          {/* Installments Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allInstallments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No installments found for this week
                    </TableCell>
                  </TableRow>
                ) : (
                  allInstallments.map((installment, index) => (
                    <TableRow key={`${installment.type}-${installment.id}-${index}`} className="hover:bg-muted/50">
                      <TableCell>
                        <Badge variant="secondary">
                          {installment.type === 'contract' ? 'Contract' : 'Deal'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {installment.type === 'contract' 
                          ? installment.contracts?.name || 'Unknown Contract'
                          : installment.deals?.name || 'Unknown Deal'
                        }
                      </TableCell>
                      <TableCell>
                        #{installment.installment_number}
                      </TableCell>
                      <TableCell>
                        {formatDate(installment.due_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(installment.calculated_amount || installment.amount_value || 0)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(installment, installment.type)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInstallmentClick(installment, installment.type)}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}