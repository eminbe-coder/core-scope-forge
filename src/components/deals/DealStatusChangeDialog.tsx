import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DealStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newStatus: { id: string; name: string } | null;
  isPauseStatus: boolean;
  onConfirm: (reason: string, resumeDate?: Date) => void;
  loading?: boolean;
}

export const DealStatusChangeDialog = ({
  open,
  onOpenChange,
  newStatus,
  isPauseStatus,
  onConfirm,
  loading = false,
}: DealStatusChangeDialogProps) => {
  const [reason, setReason] = useState('');
  const [resumeDate, setResumeDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setReason('');
      setResumeDate(undefined);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!reason.trim()) return;
    if (isPauseStatus && !resumeDate) return;
    
    onConfirm(reason.trim(), resumeDate);
  };

  const handleCancel = () => {
    setReason('');
    setResumeDate(undefined);
    onOpenChange(false);
  };

  const isValid = reason.trim().length > 0 && (!isPauseStatus || resumeDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Status Change: {newStatus?.name}
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for changing the deal status to "{newStatus?.name}".
            {isPauseStatus && ' You must also specify when you expect this deal to resume.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={`Why is this deal being marked as "${newStatus?.name}"?`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {isPauseStatus && (
            <div className="space-y-2">
              <Label>
                Expected Resume Date <span className="text-destructive">*</span>
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !resumeDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {resumeDate ? format(resumeDate, 'PPP') : 'Select resume date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={resumeDate}
                    onSelect={(date) => {
                      setResumeDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                The deal will automatically return to "Active" status on this date.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!isValid || loading}
          >
            {loading ? 'Saving...' : 'Confirm Status Change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
