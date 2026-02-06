import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { UnifiedTodoModal } from './UnifiedTodoModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DynamicCompanySelect, DynamicContactSelect, DynamicSiteSelect, DynamicCustomerSelect, DynamicDealSelect, DynamicContractSelect, DynamicInstallmentSelect } from '@/components/ui/dynamic-searchable-select';

interface TodoFormTriggerProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  /** If provided, skip entity selection and go directly to modal */
  defaultEntityType?: string;
  /** If provided, skip entity selection and go directly to modal */
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

/**
 * TodoFormTrigger - A consolidated component for triggering Todo creation
 * 
 * If defaultEntityType and defaultEntityId are provided, opens UnifiedTodoModal directly.
 * Otherwise, shows entity selection dialog first.
 */
export const TodoFormTrigger = ({ 
  onSuccess, 
  trigger, 
  defaultEntityType, 
  defaultEntityId,
  paymentTermId 
}: TodoFormTriggerProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState<string>(defaultEntityType || '');
  const [selectedEntityId, setSelectedEntityId] = useState<string>(defaultEntityId || '');
  
  // For installment selection flow
  const [installmentParentType, setInstallmentParentType] = useState<string>('');
  const [installmentParentId, setInstallmentParentId] = useState<string>('');

  const handleTriggerClick = () => {
    if (defaultEntityType && defaultEntityId) {
      // Skip entity selection, go directly to modal
      setSelectedEntityType(defaultEntityType);
      setSelectedEntityId(defaultEntityId);
      setTodoModalOpen(true);
    } else if (defaultEntityType === 'standalone') {
      setSelectedEntityType('standalone');
      setTodoModalOpen(true);
    } else {
      // Show entity selection dialog
      setSelectorOpen(true);
    }
  };

  const handleEntitySelection = () => {
    if (selectedEntityType === 'installment') {
      if (installmentParentType && installmentParentId && selectedEntityId) {
        setSelectorOpen(false);
        setTodoModalOpen(true);
      }
    } else if (selectedEntityType && (selectedEntityId || selectedEntityType === 'standalone')) {
      setSelectorOpen(false);
      setTodoModalOpen(true);
    }
  };

  const handleTodoSuccess = () => {
    setTodoModalOpen(false);
    resetState();
    onSuccess?.();
  };

  const handleTodoModalClose = () => {
    setTodoModalOpen(false);
    resetState();
  };

  const resetState = () => {
    if (!defaultEntityType || !defaultEntityId) {
      setSelectedEntityType('');
      setSelectedEntityId('');
      setInstallmentParentType('');
      setInstallmentParentId('');
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
        return null;
      default:
        return null;
    }
  };

  const isSubmitDisabled = 
    !selectedEntityType || 
    (!selectedEntityId && selectedEntityType !== 'standalone') ||
    (selectedEntityType === 'installment' && (!installmentParentType || !installmentParentId || !selectedEntityId));

  return (
    <>
      {/* Trigger Button */}
      <div onClick={handleTriggerClick}>
        {trigger || defaultTrigger}
      </div>

      {/* Entity Selection Dialog */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
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
                This to-do will not be linked to any specific entity.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEntitySelection} disabled={isSubmitDisabled}>
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Todo Modal - the master create/edit modal */}
      <UnifiedTodoModal
        isOpen={todoModalOpen}
        onClose={handleTodoModalClose}
        onUpdate={handleTodoSuccess}
        entityType={selectedEntityType.toLowerCase()}
        entityId={selectedEntityId || undefined}
        paymentTermId={paymentTermId}
        canEdit={true}
      />
    </>
  );
};
