import * as React from "react";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompanySelect, ContactSelect } from "@/components/ui/entity-select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { cn } from "@/lib/utils";

interface DealSource {
  id: string;
  name: string;
  description?: string;
}

interface SourceValues {
  sourceCategory: string;
  companySource: string;
  contactSource: string;
}

interface EnhancedSourceSelectProps {
  value: SourceValues;
  onValueChange: (value: SourceValues) => void;
  className?: string;
  disabled?: boolean;
}

export const EnhancedSourceSelect = React.forwardRef<HTMLDivElement, EnhancedSourceSelectProps>(
  ({ value, onValueChange, className, disabled }, ref) => {
    const { currentTenant } = useTenant();
    const [dealSources, setDealSources] = useState<DealSource[]>([]);

    // Load deal sources on mount
    useEffect(() => {
      if (currentTenant) {
        loadDealSources();
      }
    }, [currentTenant]);

    const loadDealSources = async () => {
      if (!currentTenant) return;

      try {
        const { data, error } = await supabase
          .from('deal_sources')
          .select('id, name, description')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('sort_order');

        if (error) throw error;
        setDealSources(data || []);
      } catch (error) {
        console.error('Error loading deal sources:', error);
      }
    };

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {/* Source Category */}
        <div className="space-y-2">
          <Label>Source Category</Label>
          <Select
            value={value.sourceCategory}
            onValueChange={(val) => onValueChange({ ...value, sourceCategory: val })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source category" />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {dealSources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Company Source - Using standardized CompanySelect */}
        <div className="space-y-2">
          <Label>Company Source</Label>
          <CompanySelect
            value={value.companySource}
            onValueChange={(companyId) => 
              onValueChange({ ...value, companySource: companyId || '' })
            }
            placeholder="Search companies..."
            disabled={disabled}
            showQuickAdd={true}
          />
        </div>

        {/* Contact Source - Using standardized ContactSelect */}
        <div className="space-y-2">
          <Label>Contact Source</Label>
          <ContactSelect
            value={value.contactSource}
            onValueChange={(contactId) => 
              onValueChange({ ...value, contactSource: contactId || '' })
            }
            placeholder="Search contacts..."
            disabled={disabled}
            showQuickAdd={true}
          />
        </div>
      </div>
    );
  }
);

EnhancedSourceSelect.displayName = "EnhancedSourceSelect";

export type { SourceValues };
