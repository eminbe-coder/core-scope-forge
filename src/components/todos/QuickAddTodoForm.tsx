import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { TodoForm } from './TodoForm';
import { DynamicCompanySelect, DynamicContactSelect, DynamicSiteSelect, DynamicCustomerSelect, DynamicDealSelect, DynamicContractSelect, DynamicInstallmentSelect } from '@/components/ui/dynamic-searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface QuickAddTodoFormProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  defaultEntityType?: string;
  defaultEntityId?: string;
  paymentTermId?: string;
}

const ENTITY_TYPES = [
  { value: 'company', label: 'Company' },
  { value: 'contact', label: 'Contact' },
  { value: 'site', label: 'Site' },
  { value: 'customer', label: 'Customer' },
  { value: 'deal', label: 'Deal' },
  { value: 'contract', label: 'Contract' },
  { value: 'installment', label: 'Installment' },
  { value: 'standalone', label: 'Standalone' },
] as const;

const INSTALLMENT_PARENT_TYPES = [
  { value: 'deal', label: 'Deal' },
  { value: 'contract', label: 'Contract' },
] as const;

export const QuickAddTodoForm = ({ 
  onSuccess, 
  trigger, 
  defaultEntityType, 
  defaultEntityId,
  paymentTermId 
}: QuickAddTodoFormProps) => {
  const [open, setOpen] = useState(false);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState<string>(defaultEntityType || '');
  const [selectedEntityId, setSelectedEntityId] = useState<string>(defaultEntityId || '');
  
  // For installment selection flow
  const [installmentParentType, setInstallmentParentType] = useState<string>('');
  const [installmentParentId, setInstallmentParentId] = useState<string>('');

  const handleEntitySelection = () => {
    if (selectedEntityType === 'installment') {
      // For installments, we need parent type and parent ID, then installment ID
      if (installmentParentType && installmentParentId && selectedEntityId) {
        setOpen(false);
        setTodoModalOpen(true);
      }
    } else if (selectedEntityType && (selectedEntityId || selectedEntityType === 'standalone')) {
      setOpen(false);
      setTodoModalOpen(true);
    }
  };

  const handleTodoSuccess = () => {
    setTodoModalOpen(false);
    setSelectedEntityType(defaultEntityType || '');
    setSelectedEntityId(defaultEntityId || '');
    setInstallmentParentType('');
    setInstallmentParentId('');
    onSuccess?.();
  };

  const handleTodoModalClose = (open: boolean) => {
    setTodoModalOpen(open);
    if (!open) {
      setSelectedEntityType(defaultEntityType || '');
      setSelectedEntityId(defaultEntityId || '');
      setInstallmentParentType('');
      setInstallmentParentId('');
    }
  };

  // If default entity is provided, go directly to todo form
  const handleOpen = (open: boolean) => {
    if (defaultEntityType && defaultEntityId) {
      setTodoModalOpen(open);
    } else {
      setOpen(open);
    }
  };

  const defaultTrigger = (
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Add To-Do
    </Button>
  );

  const renderEntitySelect = () => {
    switch (selectedEntityType) {
      case 'company':
        return (
          <DynamicCompanySelect
            value={selectedEntityId}
            onValueChange={setSelectedEntityId}
            placeholder="Select a company"
            searchPlaceholder="Search companies..."
            emptyText="No companies found"
          />
        );
      case 'contact':
        return (
          <DynamicContactSelect
            value={selectedEntityId}
            onValueChange={setSelectedEntityId}
            placeholder="Select a contact"
            searchPlaceholder="Search contacts..."
            emptyText="No contacts found"
          />
        );
      case 'site':
        return (
          <DynamicSiteSelect
            value={selectedEntityId}
            onValueChange={setSelectedEntityId}
            placeholder="Select a site"
            searchPlaceholder="Search sites..."
            emptyText="No sites found"
          />
        );
      case 'customer':
        return (
          <DynamicCustomerSelect
            value={selectedEntityId}
            onValueChange={setSelectedEntityId}
            placeholder="Select a customer"
            searchPlaceholder="Search customers..."
            emptyText="No customers found"
          />
        );
      case 'deal':
        return (
          <DynamicDealSelect
            value={selectedEntityId}
            onValueChange={setSelectedEntityId}
            placeholder="Select a deal"
            searchPlaceholder="Search deals..."
            emptyText="No deals found"
          />
        );
      case 'contract':
        return (
          <DynamicContractSelect
            value={selectedEntityId}
            onValueChange={setSelectedEntityId}
            placeholder="Select a contract"
            searchPlaceholder="Search contracts..."
            emptyText="No contracts found"
          />
        );
      case 'installment':
        return (
          <div className="space-y-4">
            {!installmentParentType && (
              <div className="space-y-2">
                <Label>Select Parent Type</Label>
                <Select value={installmentParentType} onValueChange={setInstallmentParentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose Deal or Contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTALLMENT_PARENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {installmentParentType && !installmentParentId && (
              <div className="space-y-2">
                <Label>Select {INSTALLMENT_PARENT_TYPES.find(t => t.value === installmentParentType)?.label}</Label>
                {installmentParentType === 'deal' ? (
                  <DynamicDealSelect
                    value={installmentParentId}
                    onValueChange={setInstallmentParentId}
                    placeholder="Select a deal"
                    searchPlaceholder="Search deals..."
                    emptyText="No deals found"
                  />
                ) : (
                  <DynamicContractSelect
                    value={installmentParentId}
                    onValueChange={setInstallmentParentId}
                    placeholder="Select a contract"
                    searchPlaceholder="Search contracts..."
                    emptyText="No contracts found"
                  />
                )}
              </div>
            )}
            
            {installmentParentType && installmentParentId && (
              <div className="space-y-2">
                <Label>Select Installment</Label>
                <DynamicInstallmentSelect
                  value={selectedEntityId}
                  onValueChange={setSelectedEntityId}
                  placeholder="Select an installment"
                  searchPlaceholder="Search installments..."
                  emptyText="No installments found"
                  contractId={installmentParentType === 'contract' ? installmentParentId : undefined}
                  dealId={installmentParentType === 'deal' ? installmentParentId : undefined}
                />
              </div>
            )}
          </div>
        );
      case 'standalone':
        return null; // No entity selection needed for standalone
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Entity for To-Do</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select 
                value={selectedEntityType} 
                onValueChange={(value) => {
                  setSelectedEntityType(value);
                  setSelectedEntityId('');
                  setInstallmentParentType('');
                  setInstallmentParentId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEntityType && selectedEntityType !== 'standalone' && (
              <div className="space-y-2">
                <Label>Select {ENTITY_TYPES.find(t => t.value === selectedEntityType)?.label}</Label>
                {renderEntitySelect()}
              </div>
            )}

            {selectedEntityType === 'standalone' && (
              <div className="text-sm text-muted-foreground">
                This todo will not be linked to any specific entity.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEntitySelection}
                disabled={
                  !selectedEntityType || 
                  (!selectedEntityId && selectedEntityType !== 'standalone') ||
                  (selectedEntityType === 'installment' && (!installmentParentType || !installmentParentId || !selectedEntityId))
                }
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {todoModalOpen && (
        <TodoForm
          entityType={(defaultEntityType || selectedEntityType).toLowerCase()}
          entityId={defaultEntityId || selectedEntityId || (selectedEntityType === 'standalone' ? 'standalone' : '')}
          paymentTermId={paymentTermId}
          onSuccess={handleTodoSuccess}
          defaultOpen={todoModalOpen}
        />
      )}
    </>
  );
};