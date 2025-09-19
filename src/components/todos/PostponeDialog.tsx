import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock } from 'lucide-react';

interface PostponeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newDate: string, newTime: string, reason: string) => void;
  currentDate?: string;
  currentTime?: string;
  loading?: boolean;
}

export const PostponeDialog = ({
  open,
  onOpenChange,
  onConfirm,
  currentDate,
  currentTime,
  loading = false
}: PostponeDialogProps) => {
  const [newDate, setNewDate] = useState(currentDate || '');
  const [newTime, setNewTime] = useState(currentTime || '');
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!newDate) return;
    onConfirm(newDate, newTime, reason);
    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Postpone Todo
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-date">New Due Date *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="pl-10"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-time">New Due Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Postponement *</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for postponing this todo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!newDate || !reason.trim() || loading}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? 'Postponing...' : 'Postpone Todo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};