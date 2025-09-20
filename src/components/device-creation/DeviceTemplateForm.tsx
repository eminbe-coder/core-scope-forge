import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

interface DeviceTemplateProperty {
  id: string;
  property_name: string;
  label_en: string;
  data_type: string;
  required: boolean;
  is_identifier?: boolean;
  device_template_property_options?: Array<{
    id: string;
    code: string;
    label_en: string;
    cost_modifier?: number;
  }>;
}

interface DeviceTemplateFormProps {
  templateProperties: DeviceTemplateProperty[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
}

export function DeviceTemplateForm({ templateProperties, values, onChange }: DeviceTemplateFormProps) {
  const [dynamicValues, setDynamicValues] = useState<Record<string, string[]>>({});

  const addDynamicValue = (propertyName: string) => {
    const currentValues = dynamicValues[propertyName] || [];
    const newValues = [...currentValues, ''];
    setDynamicValues(prev => ({ ...prev, [propertyName]: newValues }));
    onChange(propertyName, newValues);
  };

  const updateDynamicValue = (propertyName: string, index: number, value: string) => {
    const currentValues = dynamicValues[propertyName] || [];
    const newValues = [...currentValues];
    newValues[index] = value;
    setDynamicValues(prev => ({ ...prev, [propertyName]: newValues }));
    onChange(propertyName, newValues.filter(v => v.trim().length > 0));
  };

  const removeDynamicValue = (propertyName: string, index: number) => {
    const currentValues = dynamicValues[propertyName] || [];
    const newValues = currentValues.filter((_, i) => i !== index);
    setDynamicValues(prev => ({ ...prev, [propertyName]: newValues }));
    onChange(propertyName, newValues.filter(v => v.trim().length > 0));
  };

  // Initialize dynamic values from props
  React.useEffect(() => {
    const initialDynamic: Record<string, string[]> = {};
    templateProperties.forEach(prop => {
      if (prop.data_type === 'dynamic_multiselect' && values[prop.property_name]) {
        initialDynamic[prop.property_name] = Array.isArray(values[prop.property_name]) ? values[prop.property_name] : [];
      }
    });
    setDynamicValues(initialDynamic);
  }, [templateProperties, values]);

  const renderPropertyInput = (property: DeviceTemplateProperty) => {
    const currentValue = values[property.property_name];

    switch (property.data_type) {
      case 'text':
      case 'url':
      case 'email':
      case 'phone':
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => onChange(property.property_name, e.target.value)}
            placeholder={`Enter ${property.label_en.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={currentValue || ''}
            onChange={(e) => onChange(property.property_name, e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={`Enter ${property.label_en.toLowerCase()}`}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={currentValue || false}
              onCheckedChange={(checked) => onChange(property.property_name, checked)}
            />
            <Label>Yes</Label>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={currentValue || ''}
            onChange={(e) => onChange(property.property_name, e.target.value)}
          />
        );

      case 'color':
        return (
          <Input
            type="color"
            value={currentValue || '#000000'}
            onChange={(e) => onChange(property.property_name, e.target.value)}
          />
        );

      case 'select':
        return (
          <Select value={currentValue || ''} onValueChange={(value) => onChange(property.property_name, value)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${property.label_en.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {property.device_template_property_options?.map((option) => (
                <SelectItem key={option.id} value={option.code}>
                  {option.label_en}
                  {option.cost_modifier && (
                    <span className="text-muted-foreground ml-2">
                      ({option.cost_modifier > 0 ? '+' : ''}{option.cost_modifier})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(currentValue) ? currentValue : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {property.device_template_property_options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedValues.includes(option.code)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange(property.property_name, [...selectedValues, option.code]);
                      } else {
                        onChange(property.property_name, selectedValues.filter(v => v !== option.code));
                      }
                    }}
                  />
                  <Label className="text-sm">{option.label_en}</Label>
                </div>
              ))}
            </div>
            {selectedValues.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedValues.map((value) => {
                  const option = property.device_template_property_options?.find(opt => opt.code === value);
                  return (
                    <Badge key={value} variant="secondary" className="text-xs">
                      {option?.label_en || value}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'dynamic_multiselect':
        const dynamicCurrentValues = dynamicValues[property.property_name] || [''];
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">
              Add custom values for {property.label_en.toLowerCase()}
            </div>
            {dynamicCurrentValues.map((value, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={value}
                  onChange={(e) => updateDynamicValue(property.property_name, index, e.target.value)}
                  placeholder={`Enter ${property.label_en.toLowerCase()} value`}
                />
                {dynamicCurrentValues.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDynamicValue(property.property_name, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addDynamicValue(property.property_name)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Value
            </Button>
            {dynamicValues[property.property_name]?.filter(v => v.trim()).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {dynamicValues[property.property_name]?.filter(v => v.trim()).map((value, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {value}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => onChange(property.property_name, e.target.value)}
            placeholder={`Enter ${property.label_en.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {templateProperties.map((property) => (
        <div key={property.id} className="space-y-2">
          <Label htmlFor={property.property_name}>
            {property.label_en}
            {property.required && <span className="text-destructive ml-1">*</span>}
            {property.is_identifier && (
              <Badge variant="outline" className="ml-2 text-xs">Identifier</Badge>
            )}
          </Label>
          {renderPropertyInput(property)}
        </div>
      ))}
    </div>
  );
}