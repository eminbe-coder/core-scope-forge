import { useState, useCallback } from "react";
import { User } from "lucide-react";
import { useDynamicContacts } from "@/hooks/use-dynamic-entities";
import { UniversalContactModal } from "@/components/modals/UniversalContactModal";
import { EntitySelectPopover } from "./EntitySelectPopover";
import { BaseEntitySelectProps, EntityOption } from "./types";

interface ContactSelectProps extends BaseEntitySelectProps {
  renderOption?: (option: EntityOption) => string;
  includeCompanyField?: boolean;
}

export function ContactSelect({
  value,
  onValueChange,
  placeholder = "Select contact...",
  searchPlaceholder = "Search contacts...",
  emptyText = "No contacts found.",
  disabled,
  className,
  showQuickAdd = true,
  renderOption,
  includeCompanyField = true,
}: ContactSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { contacts, loading, error, refresh } = useDynamicContacts({
    enabled: true,
    searchTerm,
    limit: 100,
  });

  const getDisplayName = useCallback(
    (option: EntityOption) => {
      if (renderOption) return renderOption(option);
      const fullName = `${option.first_name || ""} ${option.last_name || ""}`.trim();
      return option.email ? `${fullName} (${option.email})` : fullName || option.id;
    },
    [renderOption]
  );

  const handleContactCreated = (contact: { id: string; first_name: string; last_name?: string; email?: string }) => {
    onValueChange(contact.id);
    setShowModal(false);
    refresh();
  };

  return (
    <>
      <EntitySelectPopover
        value={value}
        options={contacts}
        loading={loading}
        error={error}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        disabled={disabled}
        className={className}
        icon={<User className="h-4 w-4 text-muted-foreground" />}
        getDisplayName={getDisplayName}
        onValueChange={onValueChange}
        onSearchChange={setSearchTerm}
        onRefresh={refresh}
        onQuickAdd={() => setShowModal(true)}
        quickAddLabel="Add New Contact"
        showQuickAdd={showQuickAdd}
      />

      <UniversalContactModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onContactCreated={handleContactCreated}
        title="Add New Contact"
      />
    </>
  );
}
