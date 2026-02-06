import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateCompanyForm } from '@/components/forms/CreateCompanyForm';
import { Building } from 'lucide-react';

interface UniversalCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onCompanyCreated?: (company: { id: string; name: string }) => void;
}

export const UniversalCompanyModal = ({ open, onClose, onCompanyCreated }: UniversalCompanyModalProps) => {
  const handleSuccess = (id: string) => {
    // Fetch the company name to pass back
    onCompanyCreated?.({ id, name: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Add Company
          </DialogTitle>
        </DialogHeader>
        <CreateCompanyForm 
          isLead={false}
          createMode="new"
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};
