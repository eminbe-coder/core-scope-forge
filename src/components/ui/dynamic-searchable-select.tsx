import { useState, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  useDynamicCompanies, 
  useDynamicContacts, 
  useDynamicSites, 
  useDynamicCustomers 
} from "@/hooks/use-dynamic-entities";

interface Option {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  [key: string]: any;
}

interface DynamicSearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  entityType: 'companies' | 'contacts' | 'sites' | 'customers';
  renderOption?: (option: Option) => string;
  onAddNew?: () => void;
  addNewLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function DynamicSearchableSelect({
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  entityType,
  renderOption,
  onAddNew,
  addNewLabel,
  disabled,
  className,
}: DynamicSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Use appropriate hook based on entity type
  const companiesHook = useDynamicCompanies({ 
    enabled: open && entityType === 'companies',
    searchTerm,
    limit: 100
  });
  
  const contactsHook = useDynamicContacts({ 
    enabled: open && entityType === 'contacts',
    searchTerm,
    limit: 100
  });
  
  const sitesHook = useDynamicSites({ 
    enabled: open && entityType === 'sites',
    searchTerm,
    limit: 100
  });
  
  const customersHook = useDynamicCustomers({ 
    enabled: open && entityType === 'customers',
    searchTerm,
    limit: 100
  });

  // Select the appropriate hook result
  const hookResult = useMemo(() => {
    switch (entityType) {
      case 'companies':
        return { 
          options: companiesHook.companies, 
          loading: companiesHook.loading, 
          error: companiesHook.error,
          refresh: companiesHook.refresh
        };
      case 'contacts':
        return { 
          options: contactsHook.contacts, 
          loading: contactsHook.loading, 
          error: contactsHook.error,
          refresh: contactsHook.refresh
        };
      case 'sites':
        return { 
          options: sitesHook.sites, 
          loading: sitesHook.loading, 
          error: sitesHook.error,
          refresh: sitesHook.refresh
        };
      case 'customers':
        return { 
          options: customersHook.customers, 
          loading: customersHook.loading, 
          error: customersHook.error,
          refresh: customersHook.refresh
        };
      default:
        return { options: [], loading: false, error: null, refresh: () => {} };
    }
  }, [entityType, companiesHook, contactsHook, sitesHook, customersHook]);

  const { options, loading, error, refresh } = hookResult;

  const selectedOption = options.find(option => option.id === value);

  const getDisplayName = (option: Option) => {
    if (renderOption) return renderOption(option);
    if (option.name) return option.name;
    if (option.first_name) {
      const fullName = `${option.first_name} ${option.last_name || ''}`.trim();
      return option.email ? `${fullName} (${option.email})` : fullName;
    }
    return option.id;
  };

  // Handle search term changes with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      // Search term is handled by the hook directly
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Refresh data when popover opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSearchTerm("");
      refresh();
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between"
            disabled={disabled}
          >
            {selectedOption
              ? getDisplayName(selectedOption)
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-background border shadow-lg" align="start">
          <Command>
            <CommandInput 
              placeholder={searchPlaceholder} 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : error ? (
                <div className="p-4 text-sm text-destructive text-center">
                  {error}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={refresh}
                    className="ml-2"
                  >
                    Retry
                  </Button>
                </div>
              ) : options.length === 0 ? (
                <CommandEmpty>{emptyText}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.id}
                      onSelect={(currentValue) => {
                        onValueChange(currentValue === value ? "" : currentValue);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {getDisplayName(option)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {onAddNew && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddNew}
          className="flex items-center gap-1 px-3"
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          {addNewLabel}
        </Button>
      )}
    </div>
  );
}

// Convenience components for specific entity types
export function DynamicCompanySelect(props: Omit<DynamicSearchableSelectProps, 'entityType'>) {
  return <DynamicSearchableSelect {...props} entityType="companies" />;
}

export function DynamicContactSelect(props: Omit<DynamicSearchableSelectProps, 'entityType'>) {
  return <DynamicSearchableSelect {...props} entityType="contacts" />;
}

export function DynamicSiteSelect(props: Omit<DynamicSearchableSelectProps, 'entityType'>) {
  return <DynamicSearchableSelect {...props} entityType="sites" />;
}

export function DynamicCustomerSelect(props: Omit<DynamicSearchableSelectProps, 'entityType'>) {
  return <DynamicSearchableSelect {...props} entityType="customers" />;
}