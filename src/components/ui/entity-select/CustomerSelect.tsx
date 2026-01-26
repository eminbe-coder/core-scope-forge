import { useState, useCallback } from "react";
import { Users } from "lucide-react";
import { useDynamicCustomers } from "@/hooks/use-dynamic-entities";
import { EntitySelectPopover } from "./EntitySelectPopover";
import { BaseEntitySelectProps, EntityOption } from "./types";

interface CustomerSelectProps extends BaseEntitySelectProps {
  renderOption?: (option: EntityOption) => string;
}

export function CustomerSelect({
  value,
  onValueChange,
  placeholder = "Select customer...",
  searchPlaceholder = "Search customers...",
  emptyText = "No customers found.",
  disabled,
  className,
  showQuickAdd = false, // Customers don't have a quick add modal by default
  renderOption,
}: CustomerSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { customers, loading, error, refresh } = useDynamicCustomers({
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

  return (
    <EntitySelectPopover
      value={value}
      options={customers}
      loading={loading}
      error={error}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      disabled={disabled}
      className={className}
      icon={<Users className="h-4 w-4 text-muted-foreground" />}
      getDisplayName={getDisplayName}
      onValueChange={onValueChange}
      onSearchChange={setSearchTerm}
      onRefresh={refresh}
      showQuickAdd={false}
    />
  );
}
