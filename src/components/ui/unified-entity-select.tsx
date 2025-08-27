import * as React from "react";
import { useState, useEffect } from "react";
import { Check, ChevronDown, Building, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Customer {
  id: string;
  name: string;
  type: 'customer';
}

interface Company {
  id: string;
  name: string;
  type: 'company';
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  type: 'contact';
}

type UnifiedEntity = Customer | Company | Contact;

interface UnifiedEntitySelectProps {
  value?: string;
  onValueChange?: (value: string, entity: UnifiedEntity) => void;
  customers: Customer[];
  companies: Company[];
  contacts: Contact[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

export const UnifiedEntitySelect = React.forwardRef<HTMLButtonElement, UnifiedEntitySelectProps>(
  ({
    value,
    onValueChange,
    customers,
    companies,
    contacts,
    placeholder = "Select entity...",
    searchPlaceholder = "Search customers, companies, contacts...",
    emptyText = "No entities found.",
    className,
    disabled,
  }, ref) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Combine all entities with type information
    const allEntities: UnifiedEntity[] = [
      ...customers.map(c => ({ ...c, type: 'customer' as const })),
      ...companies.map(c => ({ ...c, type: 'company' as const })),
      ...contacts.map(c => ({ ...c, type: 'contact' as const })),
    ];

    // Filter entities based on search term
    const filteredEntities = allEntities.filter(entity => {
      const searchLower = searchTerm.toLowerCase();
      
      if (entity.type === 'customer' || entity.type === 'company') {
        return entity.name.toLowerCase().includes(searchLower);
      } else if (entity.type === 'contact') {
        const fullName = `${entity.first_name} ${entity.last_name}`.toLowerCase();
        const email = entity.email?.toLowerCase() || '';
        return fullName.includes(searchLower) || email.includes(searchLower);
      }
      
      return false;
    });

    // Find selected entity
    const selectedEntity = allEntities.find(entity => entity.id === value);

    // Get display name for entity
    const getDisplayName = (entity: UnifiedEntity) => {
      if (entity.type === 'customer' || entity.type === 'company') {
        return entity.name;
      } else if (entity.type === 'contact') {
        return `${entity.first_name} ${entity.last_name}${entity.email ? ` (${entity.email})` : ''}`;
      }
      return '';
    };

    // Get icon for entity type
    const getEntityIcon = (type: string) => {
      switch (type) {
        case 'customer':
          return <Users className="h-4 w-4" />;
        case 'company':
          return <Building className="h-4 w-4" />;
        case 'contact':
          return <User className="h-4 w-4" />;
        default:
          return null;
      }
    };

    // Get type label
    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'customer':
          return 'Customer';
        case 'company':
          return 'Company';
        case 'contact':
          return 'Contact';
        default:
          return '';
      }
    };

    const handleSelect = (entity: UnifiedEntity) => {
      onValueChange?.(entity.id, entity);
      setOpen(false);
      setSearchTerm("");
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between", className)}
            disabled={disabled}
          >
            {selectedEntity ? (
              <div className="flex items-center gap-2">
                {getEntityIcon(selectedEntity.type)}
                <span className="truncate">{getDisplayName(selectedEntity)}</span>
                <span className="text-xs text-muted-foreground">({getTypeLabel(selectedEntity.type)})</span>
              </div>
            ) : (
              placeholder
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="p-2">
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
          </div>
          <ScrollArea className="max-h-60">
            {filteredEntities.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {emptyText}
              </div>
            ) : (
              <div className="p-1">
                {filteredEntities.map((entity) => (
                  <Button
                    key={`${entity.type}-${entity.id}`}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => handleSelect(entity)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {getEntityIcon(entity.type)}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{getDisplayName(entity)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getTypeLabel(entity.type)}
                        </div>
                      </div>
                      {entity.id === value && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }
);

UnifiedEntitySelect.displayName = "UnifiedEntitySelect";