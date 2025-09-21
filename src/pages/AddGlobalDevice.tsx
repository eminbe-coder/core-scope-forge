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
  brand_id?: string;
  sku_generation_type?: 'fixed' | 'dynamic';
  device_template_properties: Array<{
    id: string;
    property_name: string;
    label_en: string;
    property_type: string;
    is_required: boolean;
    is_identifier?: boolean;
    is_device_name?: boolean;
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
          brand_id,
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
      
      // Set brand from template's brand_id
      let templateBrand = '';
      if (selectedTemplate.brand_id) {
        const brand = brands.find(b => b.id === selectedTemplate.brand_id);
        templateBrand = brand?.name || '';
      }
      
      setFormData(prev => ({
        ...prev,
        device_type_id: selectedTemplate.device_type_id || prev.device_type_id,
        brand: templateBrand || prev.brand,
      }));

      // Always include fixed properties
      const initialTemplateProps: Record<string, any> = {
        cost_price: 0,
        cost_price_currency_id: '',
        sku: '',
        short_description: '',
        long_description: '',
        device_image: ''
      };
      
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
  }, [selectedTemplateId, deviceTemplates, deviceTypes, brands]);

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
    if (!templateProperties.cost_price || !templateProperties.sku || !templateProperties.short_description || !templateProperties.long_description) {
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
          cost_price: templateProperties.cost_price || 0,
          cost_price_currency_id: templateProperties.cost_price_currency_id || '',
          sku: templateProperties.sku || '',
          short_description: templateProperties.short_description || '',
          long_description: templateProperties.long_description || '',
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
                {/* Basic Device Information - Top Row */}
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

                  const deviceNameProperty = templateProps.find(p => (p as any).is_device_name);
                  const brandFromTemplate = selectedTemplate?.brand_id ? true : false;

                  return (
                    <div className="space-y-4">
                      {/* Device Name/Model - moved to top with item code */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        {deviceNameProperty ? (
                          <div>
                            <Label htmlFor="device_name_prop">Device Name / {deviceNameProperty.label_en} *</Label>
                            <Input
                              id="device_name_prop"
                              value={templateProperties[deviceNameProperty.property_name] || ''}
                              onChange={(e) => handleTemplatePropertyChange(deviceNameProperty.property_name, e.target.value)}
                              placeholder={`Enter ${deviceNameProperty.label_en.toLowerCase()}`}
                            />
                          </div>
                        ) : (
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
                          <Label htmlFor="sku">SKU *</Label>
                          <Input
                            id="sku"
                            value={templateProperties.sku || ''}
                            onChange={(e) => handleTemplatePropertyChange('sku', e.target.value)}
                            placeholder="Enter SKU"
                          />
                        </div>
                      </div>

                      {/* Device Type and Brand Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="device_type">Device Type *</Label>
                          <HierarchicalDeviceTypeSelect
                            value={formData.device_type_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, device_type_id: value }))}
                            placeholder="From template"
                            disabled
                          />
                        </div>
                        
                        {(brandFromTemplate || formData.brand) ? (
                          <div>
                            <Label htmlFor="brand_locked">Brand {brandFromTemplate ? '(From Template)' : ''}</Label>
                            <Input
                              id="brand_locked"
                              value={formData.brand || 'No brand selected'}
                              disabled
                              className="bg-muted"
                            />
                          </div>
                        ) : (
                          <div>
                            <Label htmlFor="brand">Brand</Label>
                            <Select value={formData.brand} onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select brand" />
                              </SelectTrigger>
                              <SelectContent>
                                {brands.map((brand) => (
                                  <SelectItem key={brand.id} value={brand.name}>
                                    {brand.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Pricing Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit_price">Unit Price</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency_id} onValueChange={(value) => setFormData(prev => ({ ...prev, currency_id: value }))}>
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
                  </div>
                </div>

                {/* Template Properties - only show if template selected */}
                {selectedTemplateId && (() => {
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
                      property_options: prop.property_options
                    }));
                  }
                  
                  if (templateProps.length > 0) {
                    return (
                      <div className="border-t pt-6">
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
              </>
            )}

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