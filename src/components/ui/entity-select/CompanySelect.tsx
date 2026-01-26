import { useState, useCallback } from "react";
import { Building } from "lucide-react";
import { useDynamicCompanies } from "@/hooks/use-dynamic-entities";
import { QuickAddCompanyModal } from "@/components/modals/QuickAddCompanyModal";
import { EntitySelectPopover } from "./EntitySelectPopover";
import { BaseEntitySelectProps, EntityOption } from "./types";

interface CompanySelectProps extends BaseEntitySelectProps {
  renderOption?: (option: EntityOption) => string;
}

export function CompanySelect({
  value,
  onValueChange,
  placeholder = "Select company...",
  searchPlaceholder = "Search companies...",
  emptyText = "No companies found.",
  disabled,
  className,
  showQuickAdd = true,
  renderOption,
}: CompanySelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { companies, loading, error, refresh } = useDynamicCompanies({
    enabled: true,
    searchTerm,
    limit: 100,
  });

  const getDisplayName = useCallback(
    (option: EntityOption) => {
      if (renderOption) return renderOption(option);
      return option.name || option.id;
    },
    [renderOption]
  );

  const handleCompanyCreated = (company: { id: string; name: string }) => {
    onValueChange(company.id);
    setShowModal(false);
    refresh();
  };

  return (
    <>
      <EntitySelectPopover
        value={value}
        options={companies}
        loading={loading}
        error={error}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        disabled={disabled}
        className={className}
        icon={<Building className="h-4 w-4 text-muted-foreground" />}
        getDisplayName={getDisplayName}
        onValueChange={onValueChange}
        onSearchChange={setSearchTerm}
        onRefresh={refresh}
        onQuickAdd={() => setShowModal(true)}
        quickAddLabel="Quick Add Company"
        showQuickAdd={showQuickAdd}
      />

      <QuickAddCompanyModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCompanyCreated={handleCompanyCreated}
      />
    </>
  );
}
