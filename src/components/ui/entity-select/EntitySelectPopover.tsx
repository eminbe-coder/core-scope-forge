import { useState, ReactNode } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
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
import { EntityOption } from "./types";

interface EntitySelectPopoverProps {
  value?: string;
  options: EntityOption[];
  loading: boolean;
  error: string | null;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  disabled?: boolean;
  className?: string;
  icon?: ReactNode;
  getDisplayName: (option: EntityOption) => string;
  onValueChange: (value: string) => void;
  onSearchChange: (search: string) => void;
  onRefresh: () => void;
  onQuickAdd?: () => void;
  quickAddLabel?: string;
  showQuickAdd?: boolean;
}

export function EntitySelectPopover({
  value,
  options,
  loading,
  error,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  className,
  icon,
  getDisplayName,
  onValueChange,
  onSearchChange,
  onRefresh,
  onQuickAdd,
  quickAddLabel = "Add New",
  showQuickAdd = true,
}: EntitySelectPopoverProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedOption = options.find((option) => option.id === value);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSearchTerm("");
      onRefresh();
    }
  };

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    onSearchChange(search);
  };

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue === value ? "" : currentValue);
    setOpen(false);
  };

  const handleQuickAdd = () => {
    setOpen(false);
    onQuickAdd?.();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            {icon}
            <span className="truncate">
              {selectedOption ? getDisplayName(selectedOption) : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] min-w-[300px] p-0 bg-background border shadow-lg z-50" 
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchTerm}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading...
                </span>
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-destructive text-center">
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
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
                    onSelect={handleSelect}
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
          {showQuickAdd && onQuickAdd && (
            <div className="p-2 border-t bg-background">
              <Button
                variant="ghost"
                className="w-full justify-start text-primary hover:text-primary"
                onClick={handleQuickAdd}
              >
                <Plus className="h-4 w-4 mr-2" />
                {quickAddLabel}
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
