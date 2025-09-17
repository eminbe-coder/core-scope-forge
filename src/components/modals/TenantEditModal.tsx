import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TenantForm } from '@/components/forms/TenantForm';

interface TenantData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  country?: string;
  company_location?: string;
  cr_number?: string;
  tax_number?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_phone_country_code?: string;
  contact_phone_number?: string;
  default_currency_id?: string;
}

interface TenantEditModalProps {
  tenant: TenantData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TenantEditModal({ tenant, open, onOpenChange, onSuccess }: TenantEditModalProps) {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
          <DialogDescription>
            Update tenant information and settings.
          </DialogDescription>
        </DialogHeader>
        
        {tenant && (
          <TenantForm
            tenant={tenant}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}