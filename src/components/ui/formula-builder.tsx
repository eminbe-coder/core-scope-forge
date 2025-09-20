import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Badge } from './badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './dropdown-menu';
import { Plus, Code, Eye } from 'lucide-react';
import { FormulaEngine, type PropertyValue } from '@/lib/formula-engine';

interface DeviceTemplateProperty {
  id: string;
  name: string;
  label_en: string;
  data_type: string;
  options?: Array<{ code: string; label_en: string; }>;
}

interface FormulaBuilderProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  properties: DeviceTemplateProperty[];
  placeholder?: string;
  description?: string;
  className?: string;
}

export function FormulaBuilder({ 
  label, 
  value, 
  onChange, 
  properties, 
  placeholder,
  description,
  className 
}: FormulaBuilderProps) {
  const [showPreview, setShowPreview] = useState(false);

  const insertProperty = (propertyName: string) => {
    const cursorPosition = (document.activeElement as HTMLInputElement)?.selectionStart || value.length;
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    const newValue = beforeCursor + `{${propertyName}}` + afterCursor;
    onChange(newValue);
  };

  const generatePreview = () => {
    if (!value || properties.length === 0) return 'Enter a formula to see preview';

    // Create sample property values for preview
    const sampleProperties: PropertyValue[] = properties.map(prop => {
      let sampleValue: string | number = '';
      
      switch (prop.data_type) {
        case 'number':
          sampleValue = 100;
          break;
        case 'select':
          sampleValue = prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'multiselect':
          sampleValue = prop.options?.[0]?.label_en || 'Option 1';
          break;
        case 'dynamic_multiselect':
          sampleValue = 'Value1, Value2, Value3';
          break;
        case 'text':
          sampleValue = 'Sample Text';
          break;
        case 'boolean':
          sampleValue = 'Yes';
          break;
        default:
          sampleValue = 'Sample';
      }

      return { name: prop.name, value: sampleValue };
    });

    try {
      if (value.includes('{') && value.includes('}')) {
        // Replace property references with sample values for preview
        let previewFormula = value;
        sampleProperties.forEach(prop => {
          const regex = new RegExp(`\\{${prop.name}\\}`, 'g');
          previewFormula = previewFormula.replace(regex, prop.value.toString());
        });
        return previewFormula;
      }
      return value;
    } catch (error) {
      return 'Formula error';
    }
  };

  const validateFormula = () => {
    if (!value) return { isValid: true };
    
    const propertyNames = properties.map(p => p.name);
    return FormulaEngine.validateFormula(value, propertyNames);
  };

  const validation = validateFormula();
  const preview = generatePreview();

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor={`formula-${label}`} className="text-sm font-medium">
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-7 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            {showPreview ? 'Hide' : 'Preview'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Property
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {properties.length === 0 ? (
                <DropdownMenuItem disabled>
                  No properties available
                </DropdownMenuItem>
              ) : (
                properties.map((property) => (
                  <DropdownMenuItem 
                    key={property.id}
                    onClick={() => insertProperty(property.name)}
                    className="flex items-center justify-between"
                  >
                    <span>{property.label_en}</span>
                    <Badge variant="secondary" className="text-xs">
                      {property.data_type}
                    </Badge>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-2">
        <Input
          id={`formula-${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'Enter formula using {property_name}'}
          className={`font-mono text-sm ${!validation.isValid ? 'border-destructive' : ''}`}
        />
        
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}

        {!validation.isValid && (
          <p className="text-xs text-destructive">{validation.error}</p>
        )}

        {showPreview && (
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Code className="h-3 w-3" />
              <span className="text-xs font-medium text-muted-foreground">Preview:</span>
            </div>
            <p className="text-sm font-mono bg-background p-2 rounded border">
              {preview}
            </p>
          </div>
        )}
      </div>

      {properties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground">Available properties:</span>
          {properties.map((property) => (
            <Badge 
              key={property.id} 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-accent"
              onClick={() => insertProperty(property.name)}
            >
              {property.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}