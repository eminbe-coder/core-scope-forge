import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface SolutionCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

interface SolutionCategorySelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SolutionCategorySelect({
  value,
  onChange,
  placeholder = "Select solution categories...",
  disabled = false
}: SolutionCategorySelectProps) {
  const { currentTenant } = useTenant();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<SolutionCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      fetchCategories();
    }
  }, [currentTenant]);

  const fetchCategories = async () => {
    if (!currentTenant) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solution_categories' as any)
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCategories((data as unknown as SolutionCategory[]) || []);
    } catch (error) {
      console.error('Error fetching solution categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategories = categories.filter(cat => value.includes(cat.id));

  const handleSelect = (categoryId: string) => {
    const newValue = value.includes(categoryId)
      ? value.filter(id => id !== categoryId)
      : [...value, categoryId];
    onChange(newValue);
  };

  const removeCategory = (categoryId: string) => {
    onChange(value.filter(id => id !== categoryId));
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1 min-h-[20px]">
              {selectedCategories.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedCategories.map((category) => (
                  <Badge
                    key={category.id}
                    variant="secondary"
                    className="text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeCategory(category.id);
                    }}
                  >
                    {category.name}
                    <button className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      ×
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search solution categories..." />
            <CommandEmpty>
              {loading ? "Loading..." : "No solution categories found."}
            </CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => handleSelect(category.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(category.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{category.name}</span>
                    {category.description && (
                      <span className="text-xs text-muted-foreground">
                        {category.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}