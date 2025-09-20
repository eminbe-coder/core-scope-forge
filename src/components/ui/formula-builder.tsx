import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Badge } from './badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from './dropdown-menu';
import { Plus, Code, Eye, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
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

  const insertProperty = (propertyReference: string) => {
    const cursorPosition = (document.activeElement as HTMLInputElement)?.selectionStart || value.length;
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    const newValue = beforeCursor + `{${propertyReference}}` + afterCursor;
    onChange(newValue);
  };

  const generatePreview = () => {
    if (!value || properties.length === 0) return 'Enter a formula to see preview';

    // Create sample property values for preview
    const sampleProperties: PropertyValue[] = properties.map(prop => {
      let sampleValue: string | number = '';
      let sampleOptions = [];
      
      switch (prop.data_type) {
        case 'number':
          sampleValue = 100;
          break;
        case 'select':
          sampleValue = prop.options?.[0]?.label_en || 'Option 1';
          sampleOptions = prop.options || [{ code: 'opt1', label_en: 'Option 1', label_ar: 'خيار 1' }];
          break;
        case 'multiselect':
          sampleValue = prop.options?.[0]?.label_en || 'Option 1';
          sampleOptions = prop.options || [{ code: 'opt1', label_en: 'Option 1', label_ar: 'خيار 1' }];
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

      return { 
        name: prop.name, 
        value: sampleValue,
        options: sampleOptions
      };
    });

    try {
      if (value.includes('{') && value.includes('}')) {
        let previewFormula = value;
        
        // Handle different reference types
        sampleProperties.forEach(prop => {
          // Basic property reference
          const basicRegex = new RegExp(`\\{${prop.name}\\}`, 'g');
          previewFormula = previewFormula.replace(basicRegex, prop.value.toString());
          
          // Code reference
          const codeRegex = new RegExp(`\\{${prop.name}\\.code\\}`, 'g');
          const sampleCode = prop.options?.[0]?.code || 'CODE';
          previewFormula = previewFormula.replace(codeRegex, sampleCode);
          
          // English label reference
          const labelEnRegex = new RegExp(`\\{${prop.name}\\.label_en\\}`, 'g');
          const sampleLabelEn = prop.options?.[0]?.label_en || prop.value.toString();
          previewFormula = previewFormula.replace(labelEnRegex, sampleLabelEn);
          
          // Arabic label reference
          const labelArRegex = new RegExp(`\\{${prop.name}\\.label_ar\\}`, 'g');
          const sampleLabelAr = prop.options?.[0]?.label_ar || 'نموذج';
          previewFormula = previewFormula.replace(labelArRegex, sampleLabelAr);
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
    <TooltipProvider>
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor={`formula-${label}`} className="text-sm font-medium">
              {label}
            </Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p><strong>Basic:</strong> {`{property_name}`} - Uses context-appropriate value</p>
                  <p><strong>Code:</strong> {`{property_name.code}`} - Uses option code (for SKU/IDs)</p>
                  <p><strong>English:</strong> {`{property_name.label_en}`} - Uses English label</p>
                  <p><strong>Arabic:</strong> {`{property_name.label_ar}`} - Uses Arabic label</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
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
              <DropdownMenuContent align="end" className="w-64">
                {properties.length === 0 ? (
                  <DropdownMenuItem disabled>
                    No properties available
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuLabel className="text-xs">Property References</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {properties.map((property) => (
                      <DropdownMenuSub key={property.id}>
                        <DropdownMenuSubTrigger className="flex items-center justify-between">
                          <span className="truncate">{property.label_en}</span>
                          <Badge variant="secondary" className="text-xs ml-2">
                            {property.data_type}
                          </Badge>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-48">
                          <DropdownMenuItem
                            onClick={() => insertProperty(property.name)}
                            className="flex items-center justify-between"
                          >
                            <span>Basic Value</span>
                            <code className="text-xs bg-muted px-1 rounded">{`{${property.name}}`}</code>
                          </DropdownMenuItem>
                          {(property.data_type === 'select' || property.data_type === 'multiselect') && (
                            <>
                              <DropdownMenuItem
                                onClick={() => insertProperty(`${property.name}.code`)}
                                className="flex items-center justify-between"
                              >
                                <span>Option Code</span>
                                <code className="text-xs bg-muted px-1 rounded">{`{${property.name}.code}`}</code>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => insertProperty(`${property.name}.label_en`)}
                                className="flex items-center justify-between"
                              >
                                <span>English Label</span>
                                <code className="text-xs bg-muted px-1 rounded">{`{${property.name}.label_en}`}</code>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => insertProperty(`${property.name}.label_ar`)}
                                className="flex items-center justify-between"
                              >
                                <span>Arabic Label</span>
                                <code className="text-xs bg-muted px-1 rounded">{`{${property.name}.label_ar}`}</code>
                              </DropdownMenuItem>
                            </>
                          )}
                          {property.data_type === 'dynamic_multiselect' && (
                            <DropdownMenuItem
                              onClick={() => insertProperty(`${property.name}.code`)}
                              className="flex items-center justify-between"
                            >
                              <span>Codes (comma-separated)</span>
                              <code className="text-xs bg-muted px-1 rounded">{`{${property.name}.code}`}</code>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ))}
                  </>
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
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Syntax Examples:</strong></p>
          <p>• SKU: <code className="bg-muted px-1 rounded">{`{brand.code}-{wattage}-{color.code}`}</code></p>
          <p>• Description: <code className="bg-muted px-1 rounded">{`{wattage}W {color.label_en} {type.label_en}`}</code></p>
          <p>• Arabic: <code className="bg-muted px-1 rounded">{`{wattage} واط {color.label_ar}`}</code></p>
        </div>

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
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground">Quick insert (basic values):</span>
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
          <div className="text-xs text-muted-foreground">
            <p><strong>Tip:</strong> Use the "Add Property" dropdown above for specific reference types (.code, .label_en, .label_ar)</p>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}