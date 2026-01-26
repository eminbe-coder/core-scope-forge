import { useState, useCallback } from "react";
import { MapPin } from "lucide-react";
import { useDynamicSites } from "@/hooks/use-dynamic-entities";
import { QuickAddSiteModal } from "@/components/modals/QuickAddSiteModal";
import { EntitySelectPopover } from "./EntitySelectPopover";
import { BaseEntitySelectProps, EntityOption } from "./types";

interface SiteSelectProps extends BaseEntitySelectProps {
  renderOption?: (option: EntityOption) => string;
}

export function SiteSelect({
  value,
  onValueChange,
  placeholder = "Select site...",
  searchPlaceholder = "Search sites...",
  emptyText = "No sites found.",
  disabled,
  className,
  showQuickAdd = true,
  renderOption,
}: SiteSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { sites, loading, error, refresh } = useDynamicSites({
    enabled: true,
    searchTerm,
    limit: 100,
  });

  const getDisplayName = useCallback(
    (option: EntityOption) => {
      if (renderOption) return renderOption(option);
      if (option.name && option.address) {
        return `${option.name} - ${option.address}`;
      }
      return option.name || option.address || option.id;
    },
    [renderOption]
  );

  const handleSiteCreated = (site: { id: string; name: string }) => {
    onValueChange(site.id);
    setShowModal(false);
    refresh();
  };

  return (
    <>
      <EntitySelectPopover
        value={value}
        options={sites}
        loading={loading}
        error={error}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        disabled={disabled}
        className={className}
        icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
        getDisplayName={getDisplayName}
        onValueChange={onValueChange}
        onSearchChange={setSearchTerm}
        onRefresh={refresh}
        onQuickAdd={() => setShowModal(true)}
        quickAddLabel="Quick Add Site"
        showQuickAdd={showQuickAdd}
      />

      <QuickAddSiteModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSiteCreated={handleSiteCreated}
      />
    </>
  );
}
