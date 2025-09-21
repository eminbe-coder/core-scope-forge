import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/use-currency';
import { ArrowLeft, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { DeviceTemplateForm } from '@/components/device-creation/DeviceTemplateForm';
import { useNavigate } from 'react-router-dom';
import { HierarchicalDeviceTypeSelect } from '@/components/ui/hierarchical-device-type-select';

interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
}

interface DeviceTemplate {
  id: string;
  name: string;
  category: string;
  device_type_id?: string;
  sku_generation_type?: 'fixed' | 'dynamic';
  device_template_properties: Array<{
    id: string;
    property_name: string;
    label_en: string;
    property_type: string;
    is_required: boolean;
    is_identifier?: boolean;
    property_options?: any;
  }>;
  properties_schema?: any;
}

const AddGlobalDevice = () => {
  const { toast } = useToast();
  const { currencySymbol } = useCurrency();
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    device_type_id: '',
    brand: '',
    model: '',
    unit_price: '',
    currency_id: '',
    sku: '',
    image_url: '',
  });

  const [templateProperties, setTemplateProperties] = useState<Record<string, any>>({});
  const [deviceTypes, setDeviceTypes] = useState<Array<{id: string; name: string}>>([]);
  const [brands, setBrands] = useState<Array<{id: string; name: string}>>([]);
  const [saving, setSaving] = useState(false);

  const fetchCurrencies = async () => {
    try {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('active', true)
        .order('code');

      if (error) throw error;
      setCurrencies(data || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const fetchDeviceTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('device_templates')
        .select(`
          id,
          name,
          category,
          device_type_id,
          properties_schema,
          device_template_properties (*),
          device_template_options (*)
        `)
        .eq('is_global', true)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setDeviceTemplates(data || []);
    } catch (error) {
      console.error('Error fetching device templates:', error);
    }
  };

  const fetchDeviceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('device_types')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setDeviceTypes(data || []);
    } catch (error) {
      console.error('Error fetching device types:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchCurrencies(),
        fetchDeviceTemplates(),
        fetchDeviceTypes(),
        fetchBrands(),
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-populate form fields from selected template
  useEffect(() => {
    const selectedTemplate = deviceTemplates.find(t => t.id === selectedTemplateId);
    if (selectedTemplate) {
      const deviceType = deviceTypes.find(dt => dt.id === selectedTemplate.device_type_id);
      
      // Get template properties to check for brand/model
      let templateProps = selectedTemplate?.device_template_properties || [];
      if (templateProps.length === 0 && selectedTemplate?.properties_schema) {
        const schema = Array.isArray(selectedTemplate.properties_schema) 
          ? selectedTemplate.properties_schema 
          : [];
        templateProps = schema.map((prop: any) => ({
          id: prop.name || prop.id,
          property_name: prop.name || prop.property_name,
          label_en: prop.label_en || prop.name,
          property_type: prop.type || prop.property_type,
          is_required: prop.required || prop.is_required || false,
          is_identifier: prop.is_identifier || false,
          property_options: prop.property_options
        }));
      }

      // Find brand property from template and get its default value
      const brandProperty = templateProps.find(p => p.property_name.toLowerCase() === 'brand');
      let defaultBrand = '';
      
      if (brandProperty) {
        // If brand is a select with options, get the first option or default
        if (brandProperty.property_type === 'select' && brandProperty.property_options) {
          let options = [];
          if (typeof brandProperty.property_options === 'string') {
            try {
              options = JSON.parse(brandProperty.property_options);
            } catch {
              options = [];
            }
          } else if (Array.isArray(brandProperty.property_options)) {
            options = brandProperty.property_options;
          }
          
          if (options.length > 0) {
            defaultBrand = options[0].code || options[0].label_en || '';
          }
        }
      }
      
      setFormData(prev => ({
        ...prev,
        device_type_id: selectedTemplate.device_type_id || prev.device_type_id,
        brand: brandProperty ? defaultBrand : prev.brand, // Use template brand if available
      }));

      // Initialize template properties with brand if it exists
      const initialTemplateProps: Record<string, any> = {};
      if (brandProperty && defaultBrand) {
        initialTemplateProps[brandProperty.property_name] = defaultBrand;
      }
      
      // Always include fixed properties
      initialTemplateProps['item_code'] = '';
      initialTemplateProps['cost_price'] = 0;
      initialTemplateProps['cost_price_currency_id'] = '';
      initialTemplateProps['device_image'] = '';
      
      setTemplateProperties(initialTemplateProps);
    } else {
      // Reset form when no template selected
      setFormData({
        name: '',
        device_type_id: '',
        brand: '',
        model: '',
        unit_price: '',
        currency_id: '',
        sku: '',
        image_url: '',
      });
      setTemplateProperties({});
    }
  }, [selectedTemplateId, deviceTemplates, deviceTypes]);

  const handleCreate = async () => {
    if (!formData.name || !formData.device_type_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Check if required fixed properties are filled
    if (!templateProperties.item_code || !templateProperties.cost_price) {
      toast({
        title: 'Error',
        description: 'Please fill in all required template properties',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Get final values from template properties and form
      const selectedTemplate = deviceTemplates.find(t => t.id === selectedTemplateId);
      let finalBrand = formData.brand;
      let finalModel = formData.model;
      let finalUnitPrice = formData.unit_price;

      // Extract values from template properties if they exist
      if (selectedTemplateId && templateProperties) {
        // Check for brand in template properties (case insensitive)
        const brandFromTemplate = templateProperties['brand'] || templateProperties['Brand'] || 
                                 Object.entries(templateProperties).find(([key]) => 
                                   key.toLowerCase() === 'brand')?.[1];
        
        const modelFromTemplate = templateProperties['model'] || templateProperties['Model'] || 
                                 Object.entries(templateProperties).find(([key]) => 
                                   key.toLowerCase() === 'model')?.[1];
        
        const costFromTemplate = templateProperties['cost'] || templateProperties['Cost'] || 
                                templateProperties['cost_price'] || templateProperties['Cost Price'] ||
                                Object.entries(templateProperties).find(([key]) => 
                                  key.toLowerCase().includes('cost') || key.toLowerCase().includes('price'))?.[1];

        if (brandFromTemplate) finalBrand = brandFromTemplate;
        if (modelFromTemplate) finalModel = modelFromTemplate;
        if (costFromTemplate && !formData.unit_price) finalUnitPrice = costFromTemplate.toString();
      }

      // Get the device type name for category field
      const deviceType = deviceTypes.find(dt => dt.id === formData.device_type_id);
      
      const deviceData = {
        name: formData.name,
        category: deviceType?.name || '',
        brand: finalBrand || null,
        model: finalModel || null,
        unit_price: finalUnitPrice ? parseFloat(finalUnitPrice) : null,
        currency_id: formData.currency_id || null,
        image_url: templateProperties.device_image || formData.image_url || null,
        is_global: true,
        template_id: selectedTemplateId || null,
        template_properties: {
          ...templateProperties,
          // Always include fixed properties
          item_code: templateProperties.item_code || '',
          cost_price: templateProperties.cost_price || 0,
          cost_price_currency_id: templateProperties.cost_price_currency_id || '',
          device_image: templateProperties.device_image || ''
        },
        tenant_id: null,
      };

      const { error } = await supabase
        .from('devices')
        .insert([deviceData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Global device created successfully',
      });

      navigate('/global-devices');
    } catch (error) {
      console.error('Error creating device:', error);
      toast({
        title: 'Error',
        description: 'Failed to create device',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTemplatePropertyChange = (name: string, value: any) => {
    setTemplateProperties(prev => {
      const newProps = { ...prev, [name]: value };
      
      // If this property is marked as device name, update the form's name field
      const selectedTemplate = deviceTemplates.find(t => t.id === selectedTemplateId);
      if (selectedTemplate) {
        const templateProps = selectedTemplate?.device_template_properties || [];
        const deviceNameProp = templateProps.find(p => p.property_name === name && (p as any).is_device_name);
        if (deviceNameProp && value) {
          setFormData(prev => ({ ...prev, name: value }));
        }
      }
      
      return newProps;
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/global-devices')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Global Devices
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add New Global Device</h1>
            <p className="text-muted-foreground">
              Create a new device in the global catalog
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Selection */}
            <div>
              <Label htmlFor="template">Device Template (Optional)</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template to use predefined properties" />
                </SelectTrigger>
                <SelectContent>
                  {deviceTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Only show device fields after template is selected */}
            {selectedTemplateId && (
              <>
                {/* Basic Device Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(() => {
                    const selectedTemplate = deviceTemplates.find(t => t.id === selectedTemplateId);
                    let templateProps = selectedTemplate?.device_template_properties || [];
                    
                    if (templateProps.length === 0 && selectedTemplate?.properties_schema) {
                      const schema = Array.isArray(selectedTemplate.properties_schema) 
                        ? selectedTemplate.properties_schema 
                        : [];
                      templateProps = schema.map((prop: any) => ({
                        id: prop.name || prop.id,
                        property_name: prop.name || prop.property_name,
                        label_en: prop.label_en || prop.name,
                        property_type: prop.type || prop.property_type,
                        is_required: prop.required || prop.is_required || false,
                        is_identifier: prop.is_identifier || false,
                        is_device_name: prop.is_device_name || false,
                        property_options: prop.property_options
                      }));
                    }

                    const hasDeviceNameProperty = templateProps.some(p => (p as any).is_device_name);
                    
                    return (
                      <>
                        {!hasDeviceNameProperty && (
                          <div>
                            <Label htmlFor="name">Device Name *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter device name"
                            />
                          </div>
                        )}
                        
                        <div>
                          <Label htmlFor="device_type">Device Type *</Label>
                          <HierarchicalDeviceTypeSelect
                            value={formData.device_type_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, device_type_id: value }))}
                            placeholder="From template"
                            disabled
                          />
                        </div>
                      </>
                    );
                  })()}

                  {(() => {
                    const selectedTemplate = deviceTemplates.find(t => t.id === selectedTemplateId);
                    let templateProps = selectedTemplate?.device_template_properties || [];
                    
                    // Handle properties_schema format if device_template_properties is empty
                    if (templateProps.length === 0 && selectedTemplate?.properties_schema) {
                      const schema = Array.isArray(selectedTemplate.properties_schema) 
                        ? selectedTemplate.properties_schema 
                        : [];
                      templateProps = schema.map((prop: any) => ({
                        id: prop.name || prop.id,
                        property_name: prop.name || prop.property_name,
                        label_en: prop.label_en || prop.name,
                        property_type: prop.type || prop.property_type,
                        is_required: prop.required || prop.is_required || false,
                        is_identifier: prop.is_identifier || false,
                        property_options: prop.property_options
                      }));
                    }

                    const brandInTemplate = templateProps.some(p => p.property_name.toLowerCase() === 'brand');
                    const modelInTemplate = templateProps.some(p => p.property_name.toLowerCase() === 'model');

                    return (
                      <>
                        {!brandInTemplate && (
                          <div>
                            <Label htmlFor="brand">Brand</Label>
                            <Input
                              id="brand"
                              value={formData.brand}
                              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                              placeholder="Brand name"
                            />
                          </div>
                        )}

                        {brandInTemplate && (
                          <div>
                            <Label htmlFor="brand">Brand (From Template)</Label>
                            <Input
                              id="brand"
                              value={(() => {
                                const brandFromTemplate = templateProperties['brand'] || templateProperties['Brand'] || 
                                                         Object.entries(templateProperties).find(([key]) => 
                                                           key.toLowerCase() === 'brand')?.[1];
                                return brandFromTemplate || formData.brand;
                              })()}
                              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                              placeholder="Brand from template"
                              disabled
                            />
                          </div>
                        )}

                        {!modelInTemplate && (
                          <div>
                            <Label htmlFor="model">Model</Label>
                            <Input
                              id="model"
                              value={formData.model}
                              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                              placeholder="Model number"
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div>
                    <Label htmlFor="unit_price">Unit Price</Label>
                    <div className="flex gap-2">
                      <Input
                        id="unit_price"
                        type="number"
                        step="0.01"
                        value={formData.unit_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                        placeholder="0.00"
                      />
                      <Select value={formData.currency_id} onValueChange={(value) => setFormData(prev => ({ ...prev, currency_id: value }))}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.id}>
                              {currency.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(() => {
                    const selectedTemplate = deviceTemplates.find(t => t.id === selectedTemplateId);
                    if (selectedTemplate?.sku_generation_type === 'dynamic') {
                      return (
                        <div>
                          <Label htmlFor="sku">SKU (Calculated)</Label>
                          <Input
                            id="sku"
                            value="Will be calculated automatically"
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      );
                    } else if (selectedTemplate?.sku_generation_type === 'fixed') {
                      return (
                        <div>
                          <Label htmlFor="sku">SKU *</Label>
                          <Input
                            id="sku"
                            value={formData.sku}
                            onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                            placeholder="Enter SKU"
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Remove specifications section - not needed with template properties */}
              </>
            )}

            {/* Template Properties - only show if template selected and has properties */}
            {selectedTemplateId && (() => {
              const selectedTemplate = deviceTemplates.find(t => t.id === selectedTemplateId);
              let templateProps = selectedTemplate?.device_template_properties || [];
              
              // Handle properties_schema format if device_template_properties is empty
              if (templateProps.length === 0 && selectedTemplate?.properties_schema) {
                const schema = Array.isArray(selectedTemplate.properties_schema) 
                  ? selectedTemplate.properties_schema 
                  : [];
                templateProps = schema.map((prop: any) => ({
                  id: prop.name || prop.id,
                  property_name: prop.name || prop.property_name,
                  label_en: prop.label_en || prop.name,
                  property_type: prop.type || prop.property_type,
                  is_required: prop.required || prop.is_required || false,
                  is_identifier: prop.is_identifier || false,
                  property_options: prop.property_options
                }));
              }
              
              if (templateProps.length > 0) {
                return (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Template Properties</h3>
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Fixed Properties (Always Available)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Item Code:</span> Unique identifier for device
                          <div className="text-xs text-blue-700 mt-1">✓ This is the device identifier</div>
                        </div>
                        <div>
                          <span className="font-medium">Cost Price:</span> Base manufacturing cost  
                          <div className="text-xs text-blue-700 mt-1">✓ Automatically populated from template</div>
                        </div>
                        <div>
                          <span className="font-medium">Device Image:</span> Product photo or illustration
                          <div className="text-xs text-blue-700 mt-1">✓ URL or file upload supported</div>
                        </div>
                      </div>
                    </div>
                    <DeviceTemplateForm
                      templateProperties={templateProps}
                      values={templateProperties}
                      onChange={handleTemplatePropertyChange}
                    />
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate('/global-devices')}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Creating...' : 'Create Device'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddGlobalDevice;