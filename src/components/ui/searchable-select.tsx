import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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

interface Option {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: any;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  renderOption?: (option: Option) => string;
  onAddNew?: () => void;
  addNewLabel?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  renderOption,
  onAddNew,
  addNewLabel,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find(option => option.id === value);

  const getDisplayName = (option: Option) => {
    if (renderOption) return renderOption(option);
    if (option.name) return option.name;
    if (option.first_name) return `${option.first_name} ${option.last_name || ''}`.trim();
    return option.id;
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
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
        <PopoverContent className="w-full p-0 bg-background border shadow-lg z-50">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
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