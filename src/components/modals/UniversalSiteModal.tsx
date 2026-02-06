import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateSiteForm } from '@/components/forms/CreateSiteForm';
import { MapPin } from 'lucide-react';

interface UniversalSiteModalProps {
  open: boolean;
  onClose: () => void;
  onSiteCreated?: (site: { id: string; name: string }) => void;
}

export const UniversalSiteModal = ({ open, onClose, onSiteCreated }: UniversalSiteModalProps) => {
  const handleSuccess = (id: string) => {
    // Fetch the site name to pass back
    onSiteCreated?.({ id, name: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Add Site
          </DialogTitle>
        </DialogHeader>
        <CreateSiteForm 
          isLead={false}
          createMode="new"
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};
