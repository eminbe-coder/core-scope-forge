import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Option {
  id: string;
  name: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
}

export function MultiSelectDropdown({
  options,
  selected,
  onSelectionChange,
  placeholder,
  searchPlaceholder,
  disabled,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (optionId: string) => {
    if (selected.includes(optionId)) {
      onSelectionChange(selected.filter(id => id !== optionId));
    } else {
      onSelectionChange([...selected, optionId]);
    }
  };

  const selectedOptions = options.filter(option => selected.includes(option.id));
  const displayText = selectedOptions.length === 0 
    ? placeholder 
    : selectedOptions.length === 1 
      ? selectedOptions[0].name
      : `${selectedOptions.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {displayText}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-background border border-border z-50">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  onSelect={() => handleToggle(option.id)}
                  className="cursor-pointer"
                >
                  <Checkbox
                    checked={selected.includes(option.id)}
                    className="mr-2"
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}