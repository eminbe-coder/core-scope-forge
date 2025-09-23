import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DynamicFieldPreview } from './DynamicFieldPreview';
import { FormulaEngine } from '@/lib/formula-engine';

interface DeviceTemplateProperty {
  id: string;
  name: string;
  label_en: string;
  label_ar: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'dynamic_multiselect' | 'boolean' | 'date' | 'calculated' | 'url' | 'email' | 'phone' | 'color';
  data_type: string;
  required: boolean;
  is_identifier: boolean;
  is_device_name: boolean;
  unit?: string;
  sort_order: number;
  property_options: any[];
  options?: Array<{ code: string; label_en: string; label_ar?: string; }>;
  formula?: string;
  depends_on_properties?: string[];
}

interface DeviceTemplate {
  id: string;
  name: string;
  label_ar?: string;
  device_type_id: string;
  brand_id?: string;
  description?: string;
  supports_multilang: boolean;
  sku_generation_type: 'fixed' | 'dynamic';
  sku_formula?: string;
  description_generation_type: 'fixed' | 'dynamic';
  description_formula?: string;
  short_description_generation_type: 'fixed' | 'dynamic';
  short_description_formula?: string;
  description_ar_generation_type?: 'fixed' | 'dynamic';
  description_ar_formula?: string;
  short_description_ar_generation_type?: 'fixed' | 'dynamic';
  short_description_ar_formula?: string;
  image_url?: string;
  is_global: boolean;
  properties: DeviceTemplateProperty[];
  template_version?: number;
  last_modified_by?: string;
  created_by?: string;
}

interface DeviceTemplateFormProps {
  templateProperties: DeviceTemplateProperty[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  selectedTemplate?: DeviceTemplate;
}

export function DeviceTemplateForm({ templateProperties, values, onChange, selectedTemplate }: DeviceTemplateFormProps) {
  const [dynamicValues, setDynamicValues] = useState<Record<string, string[]>>({});
  
  // Build fixed properties that are always available
  const fixedProperties = React.useMemo(() => {
    const baseProperties = [
      {
        id: 'item_code',
        name: 'item_code',
        label_en: 'Item Code', 
        label_ar: 'رمز العنصر',
        type: 'text' as const,
        data_type: 'text',
        required: true,
        is_identifier: true,
        is_device_name: false,
        sort_order: 0,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      },
      {
        id: 'cost_price',
        name: 'cost_price',
        label_en: 'Cost Price',
        label_ar: 'سعر التكلفة', 
        type: 'number' as const,
        data_type: 'number',
        required: true,
        is_identifier: false,
        is_device_name: false,
        sort_order: 1,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      },
      {
        id: 'cost_price_currency_id',
        name: 'cost_price_currency_id',
        label_en: 'Cost Price Currency',
        label_ar: 'عملة سعر التكلفة',
        type: 'select' as const,
        data_type: 'select',
        required: true,
        is_identifier: false,
        is_device_name: false,
        sort_order: 1.5,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      },
      {
        id: 'device_image',
        name: 'device_image',
        label_en: 'Device Image',
        label_ar: 'صورة الجهاز',
        type: 'text' as const,
        data_type: 'image',
        required: false,
        is_identifier: false,
        is_device_name: false,
        sort_order: 2.5,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      }
    ];

    // Add conditional fixed properties based on generation types
    if (selectedTemplate?.sku_generation_type === 'fixed') {
      baseProperties.push({
        id: 'sku',
        name: 'sku',
        label_en: 'SKU',
        label_ar: 'رمز التخزين',
        type: 'text' as const,
        data_type: 'text',
        required: true,
        is_identifier: true,
        is_device_name: false,
        sort_order: 3,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      });
    }

    if (selectedTemplate?.short_description_generation_type === 'fixed') {
      baseProperties.push({
        id: 'short_description',
        name: 'short_description',
        label_en: 'Short Description',
        label_ar: 'الوصف المختصر',
        type: 'text' as const,
        data_type: 'textarea',
        required: true,
        is_identifier: false,
        is_device_name: false,
        sort_order: 3.5,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      });
    }

    if (selectedTemplate?.short_description_ar_generation_type === 'fixed') {
      baseProperties.push({
        id: 'short_description_ar',
        name: 'short_description_ar',
        label_en: 'Short Description (Arabic)',
        label_ar: 'الوصف المختصر بالعربية',
        type: 'text' as const,
        data_type: 'textarea',
        required: false,
        is_identifier: false,
        is_device_name: false,
        sort_order: 3.7,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      });
    }

    if (selectedTemplate?.description_generation_type === 'fixed') {
      baseProperties.push({
        id: 'description',
        name: 'description',
        label_en: 'Description',
        label_ar: 'الوصف',
        type: 'text' as const,
        data_type: 'textarea',
        required: true,
        is_identifier: false,
        is_device_name: false,
        sort_order: 4,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      });
    }

    if (selectedTemplate?.description_ar_generation_type === 'fixed') {
      baseProperties.push({
        id: 'description_ar',
        name: 'description_ar',
        label_en: 'Arabic Description',
        label_ar: 'الوصف العربي',
        type: 'text' as const,
        data_type: 'textarea',
        required: false,
        is_identifier: false,
        is_device_name: false,
        sort_order: 5,
        property_options: [],
        options: [],
        formula: '',
        depends_on_properties: []
      });
    }

    return baseProperties;
  }, [selectedTemplate]);

  // Get all available properties (fixed + template properties)
  const getAllAvailableProperties = (): DeviceTemplateProperty[] => {
    return [...fixedProperties, ...templateProperties];
  };

  // Convert all properties to PropertyValue format for formula engine
  const getPropertyValues = React.useMemo(() => {
    const allProperties = getAllAvailableProperties();
    return allProperties.map(prop => ({
      name: prop.name,
      value: values[prop.name],
      options: prop.options
    }));
  }, [templateProperties, values, fixedProperties]);

  // Get currencies for cost price currency field
  const [currencies, setCurrencies] = React.useState<Array<{id: string; code: string; name: string}>>([]);
  
  React.useEffect(() => {
    const fetchCurrencies = async () => {
      const { data } = await supabase
        .from('currencies')
        .select('id, code, name')
        .eq('active', true)
        .order('code');
      
      if (data) {
        setCurrencies(data);
        // Update the cost_price_currency_id property options
        const currencyProperty = fixedProperties.find(p => p.name === 'cost_price_currency_id');
        if (currencyProperty) {
          currencyProperty.options = data.map(c => ({
            code: c.id,
            label_en: `${c.code} - ${c.name}`
          }));
        }
      }
    };
    fetchCurrencies();
  }, [fixedProperties]);

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
      if (prop.type === 'dynamic_multiselect' && values[prop.name]) {
        initialDynamic[prop.name] = Array.isArray(values[prop.name]) ? values[prop.name] : [];
      }
    });
    setDynamicValues(initialDynamic);
  }, [templateProperties, values]);

  const renderPropertyInput = (property: DeviceTemplateProperty) => {
    const currentValue = values[property.name];

    // Handle calculated properties with formulas
    if (property.type === 'calculated' || property.formula) {
      const calculatedValue = React.useMemo(() => {
        if (property.formula) {
          try {
            return FormulaEngine.evaluate(property.formula, getPropertyValues);
          } catch (error) {
            return 0;
          }
        }
        return 0;
      }, [property.formula, getPropertyValues]);

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-muted/30 border border-dashed rounded-md">
            <div className="text-sm font-medium">
              {calculatedValue !== 0 ? calculatedValue.toLocaleString() : 'Calculating...'}
            </div>
            <Badge variant="secondary" className="text-xs">Calculated</Badge>
          </div>
          {property.formula && (
            <div className="text-xs text-muted-foreground">
              Formula: {property.formula}
            </div>
          )}
        </div>
      );
    }

    switch (property.type) {
      case 'url':
      case 'email':
      case 'phone':
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => onChange(property.name, e.target.value)}
            placeholder={`Enter ${property.label_en.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={currentValue || ''}
            onChange={(e) => onChange(property.name, e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={`Enter ${property.label_en.toLowerCase()}`}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={currentValue || false}
              onCheckedChange={(checked) => onChange(property.name, checked)}
            />
            <Label>Yes</Label>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={currentValue || ''}
            onChange={(e) => onChange(property.name, e.target.value)}
          />
        );

      case 'color':
        return (
          <Input
            type="color"
            value={currentValue || '#000000'}
            onChange={(e) => onChange(property.name, e.target.value)}
          />
        );

      case 'text':
        // Handle image type as special text input with upload option
        if (property.data_type === 'image') {
          return (
            <div className="space-y-2">
              <Input
                type="url"
                value={currentValue || ''}
                onChange={(e) => onChange(property.name, e.target.value)}
                placeholder="Enter image URL or upload below"
              />
              <div className="text-sm text-muted-foreground">Or upload an image:</div>
              <ImageUpload
                value={currentValue || ''}
                onChange={(url) => onChange(property.name, url)}
                bucket="device-images"
                folder="devices"
              />
            </div>
          );
        }
        // Handle textarea type
        if (property.data_type === 'textarea') {
          return (
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={currentValue || ''}
              onChange={(e) => onChange(property.name, e.target.value)}
              placeholder={`Enter ${property.label_en.toLowerCase()}`}
              rows={3}
            />
          );
        }
        return (
          <Input
            value={currentValue || ''}
            onChange={(e) => onChange(property.name, e.target.value)}
            placeholder={`Enter ${property.label_en.toLowerCase()}`}
          />
        );

      case 'select':
        const selectOptions = property.options || [];
        return (
          <Select value={currentValue || ''} onValueChange={(value) => onChange(property.name, value)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${property.label_en.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option: any) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.label_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const multiselectOptions = property.options || [];
        const selectedValues = Array.isArray(currentValue) ? currentValue : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {multiselectOptions.map((option: any) => (
                <div key={option.code} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedValues.includes(option.code)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange(property.name, [...selectedValues, option.code]);
                      } else {
                        onChange(property.name, selectedValues.filter(v => v !== option.code));
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
                  const option = multiselectOptions.find((opt: any) => opt.code === value);
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
        const dynamicCurrentValues = dynamicValues[property.name] || [''];
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-2">
              Add custom values for {property.label_en.toLowerCase()}
            </div>
            {dynamicCurrentValues.map((value, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={value}
                  onChange={(e) => updateDynamicValue(property.name, index, e.target.value)}
                  placeholder={`Enter ${property.label_en.toLowerCase()} value`}
                />
                {dynamicCurrentValues.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDynamicValue(property.name, index)}
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
              onClick={() => addDynamicValue(property.name)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Value
            </Button>
            {dynamicValues[property.name]?.filter(v => v.trim()).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {dynamicValues[property.name]?.filter(v => v.trim()).map((value, index) => (
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
            onChange={(e) => onChange(property.name, e.target.value)}
            placeholder={`Enter ${property.label_en.toLowerCase()}`}
          />
        );
    }
  };

  const renderCurrencySelect = () => {
    const currentValue = values['cost_price_currency_id'];
    return (
      <Select value={currentValue || ''} onValueChange={(value) => onChange('cost_price_currency_id', value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((currency) => (
            <SelectItem key={currency.id} value={currency.id}>
              {currency.code} - {currency.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderFixedPropertyInput = (property: DeviceTemplateProperty) => {
    if (property.name === 'cost_price_currency_id') {
      return renderCurrencySelect();
    }
    return renderPropertyInput(property);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Field Previews Section */}
      {selectedTemplate && (
        selectedTemplate.sku_generation_type === 'dynamic' || 
        selectedTemplate.short_description_generation_type === 'dynamic' || 
        selectedTemplate.description_generation_type === 'dynamic' ||
        selectedTemplate.short_description_ar_generation_type === 'dynamic' ||
        selectedTemplate.description_ar_generation_type === 'dynamic'
      ) && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Generated Fields Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedTemplate.sku_generation_type === 'dynamic' && selectedTemplate.sku_formula && (
              <DynamicFieldPreview
                label="Item Code"
                formula={selectedTemplate.sku_formula}
                properties={getPropertyValues}
                context="sku"
              />
            )}
            {selectedTemplate.short_description_generation_type === 'dynamic' && selectedTemplate.short_description_formula && (
              <DynamicFieldPreview
                label="Short Description"
                formula={selectedTemplate.short_description_formula}
                properties={getPropertyValues}
                context="description_en"
                className="md:col-span-2 lg:col-span-2"
              />
            )}
            {selectedTemplate.description_generation_type === 'dynamic' && selectedTemplate.description_formula && (
              <DynamicFieldPreview
                label="Long Description"
                formula={selectedTemplate.description_formula}
                properties={getPropertyValues}
                context="description_en"
                className="md:col-span-2 lg:col-span-3"
              />
            )}
            {selectedTemplate.short_description_ar_generation_type === 'dynamic' && selectedTemplate.short_description_ar_formula && (
              <DynamicFieldPreview
                label="Short Description (Arabic)"
                formula={selectedTemplate.short_description_ar_formula}
                properties={getPropertyValues}
                context="description_ar"
                className="md:col-span-2 lg:col-span-2"
              />
            )}
            {selectedTemplate.description_ar_generation_type === 'dynamic' && selectedTemplate.description_ar_formula && (
              <DynamicFieldPreview
                label="Long Description (Arabic)"
                formula={selectedTemplate.description_ar_formula}
                properties={getPropertyValues}
                context="description_ar"
                className="md:col-span-2 lg:col-span-3"
              />
            )}
          </div>
        </div>
      )}

      {/* Fixed Properties Section */}
      {fixedProperties.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Required Device Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixedProperties.map((property) => (
              <div key={property.id} className={`space-y-2 ${
                property.data_type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : 
                property.data_type === 'image' ? 'md:col-span-2 lg:col-span-3' : ''
              }`}>
                <Label htmlFor={property.name}>
                  {property.label_en}
                  {property.required && <span className="text-destructive ml-1">*</span>}
                  {property.is_identifier && (
                    <Badge variant="outline" className="ml-2 text-xs">Identifier</Badge>
                  )}
                </Label>
                {renderFixedPropertyInput(property)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Properties Section */}
      {templateProperties.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Template Properties</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {templateProperties.map((property) => (
              <div key={property.id} className={`space-y-2 ${
                property.type === 'multiselect' || property.type === 'dynamic_multiselect' 
                  ? 'md:col-span-2 lg:col-span-2' 
                  : ''
              }`}>
                <Label htmlFor={property.name}>
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
        </div>
      )}
    </div>
  );
}