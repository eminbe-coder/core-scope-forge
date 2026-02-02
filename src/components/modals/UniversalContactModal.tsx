import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateContactForm } from '@/components/forms/CreateContactForm';
import { User } from 'lucide-react';

interface UniversalContactModalProps {
  open: boolean;
  onClose: () => void;
  onContactCreated: (contact: { id: string; first_name: string; last_name?: string; email?: string }) => void;
  title?: string;
  isLead?: boolean;
}

export const UniversalContactModal = ({
  open,
  onClose,
  onContactCreated,
  title = "Add Contact",
  isLead = false,
}: UniversalContactModalProps) => {
  const handleSuccess = (contactId: string) => {
    // The CreateContactForm handles the toast - we just need to call the callback
    onContactCreated({ id: contactId, first_name: '', last_name: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <CreateContactForm 
          isLead={isLead}
          onSuccess={handleSuccess}
          isModal={true}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};
