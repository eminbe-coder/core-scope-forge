import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, ArrowLeft, Save, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";

interface DeviceTemplateProperty {
  id: string;
  name: string;
  label_en: string;
  label_ar: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date';
  required: boolean;
  is_identifier: boolean;
  unit?: string;
  property_options: Array<{ code: string; label_en: string; label_ar: string; }>;
}

interface DeviceTemplate {
  name: string;
  name_ar: string;
  category: string;
  brand_id?: string;
  description?: string;
  description_ar?: string;
  sku_formula?: string;
  description_formula?: string;
  is_global: boolean;
  properties: DeviceTemplateProperty[];
}

const DEVICE_CATEGORIES = [
  'Lighting', 'Security', 'Climate', 'Networking', 'Audio/Visual', 'Sensors', 'Other'
];

const PROPERTY_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Single Select' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'date', label: 'Date' }
];

export default function DeviceTemplateCreate() {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState("global");
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [template, setTemplate] = useState<DeviceTemplate>({
    name: '',
    name_ar: '',
    category: '',
    brand_id: '',
    description: '',
    description_ar: '',
    sku_formula: '',
    description_formula: '',
    is_global: true,
    properties: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveId, setAutoSaveId] = useState<string | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (!currentTenant) return;

    const autoSave = async () => {
      try {
        const templateData = { ...template, activeTab } as any;
        
        if (autoSaveId) {
          await supabase
            .from('device_template_drafts')
            .update({ 
              template_data: templateData,
              updated_at: new Date().toISOString()
            })
            .eq('id', autoSaveId);
        } else {
          const { data, error } = await supabase
            .from('device_template_drafts')
            .insert({
              tenant_id: currentTenant.id,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              template_data: templateData
            })
            .select('id')
            .single();
          
          if (!error && data) {
            setAutoSaveId(data.id);
          }
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    };

    const debounceTimer = setTimeout(autoSave, 2000);
    return () => clearTimeout(debounceTimer);
  }, [template, activeTab, currentTenant, autoSaveId]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      if (!currentTenant) return;

      try {
        const { data } = await supabase
          .from('device_template_drafts')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .is('template_id', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (data) {
          const draftData = data.template_data as any;
          setTemplate(draftData);
          setActiveTab(draftData.activeTab || 'global');
          setAutoSaveId(data.id);
        }
      } catch (error) {
        // No draft found, start fresh
      }
    };

    loadDraft();
  }, [currentTenant]);

  const handleSave = async () => {
    if (!currentTenant || !template.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setIsSaving(true);
    try {
      // Save template
      const { data: templateData, error: templateError } = await supabase
        .from('device_templates')
        .insert({
          tenant_id: template.is_global ? null : currentTenant.id,
          name: template.name,
          name_ar: template.name_ar,
          category: template.category,
          brand_id: template.brand_id || null,
          description: template.description,
          description_ar: template.description_ar,
          sku_formula: template.sku_formula,
          description_formula: template.description_formula,
          is_global: template.is_global
        })
        .select('id')
        .single();

      if (templateError) throw templateError;

      // Save properties
      if (template.properties.length > 0) {
        const propertiesData = template.properties.map(prop => ({
          template_id: templateData.id,
          property_name: prop.name,
          label_en: prop.label_en,
          label_ar: prop.label_ar,
          property_type: prop.type,
          is_required: prop.required,
          is_identifier: prop.is_identifier,
          property_unit: prop.unit,
          property_options: prop.property_options as any
        }));

        const { error: propertiesError } = await supabase
          .from('device_template_properties')
          .insert(propertiesData);

        if (propertiesError) throw propertiesError;
      }

      // Clean up draft
      if (autoSaveId) {
        await supabase
          .from('device_template_drafts')
          .delete()
          .eq('id', autoSaveId);
      }

      toast.success("Template created successfully");
      navigate('/global-admin');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const addProperty = () => {
    setTemplate(prev => ({
      ...prev,
      properties: [...prev.properties, {
        id: crypto.randomUUID(),
        name: '',
        label_en: '',
        label_ar: '',
        type: 'text',
        required: false,
        is_identifier: false,
        unit: '',
        property_options: []
      }]
    }));
  };

  const updateProperty = (index: number, field: keyof DeviceTemplateProperty, value: any) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.map((prop, i) => 
        i === index ? { ...prop, [field]: value } : prop
      )
    }));
  };

  const removeProperty = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.filter((_, i) => i !== index)
    }));
  };

  const addPropertyOption = (propertyIndex: number) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.map((prop, i) => 
        i === propertyIndex 
          ? { 
              ...prop, 
              property_options: [...prop.property_options, { code: '', label_en: '', label_ar: '' }]
            } 
          : prop
      )
    }));
  };

  const updatePropertyOption = (propertyIndex: number, optionIndex: number, field: string, value: string) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.map((prop, i) => 
        i === propertyIndex 
          ? { 
              ...prop, 
              property_options: prop.property_options.map((opt, j) => 
                j === optionIndex ? { ...opt, [field]: value } : opt
              )
            } 
          : prop
      )
    }));
  };

  const removePropertyOption = (propertyIndex: number, optionIndex: number) => {
    setTemplate(prev => ({
      ...prev,
      properties: prev.properties.map((prop, i) => 
        i === propertyIndex 
          ? { 
              ...prop, 
              property_options: prop.property_options.filter((_, j) => j !== optionIndex)
            } 
          : prop
      )
    }));
  };

  const generatePreview = () => {
    const sampleData: Record<string, any> = {};
    template.properties.forEach(prop => {
      if (prop.is_identifier) {
        sampleData[prop.name] = prop.type === 'number' ? '100' : 'SAMPLE';
      }
    });

    const replacedSku = template.sku_formula?.replace(/\{(\w+)\}/g, (match, key) => {
      return sampleData[key] || match;
    }) || '';

    const replacedDescription = template.description_formula?.replace(/\{(\w+)\}/g, (match, key) => {
      return sampleData[key] || match;
    }) || '';

    return { sku: replacedSku, description: replacedDescription };
  };

  const preview = generatePreview();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/global-admin')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Global Admin
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Device Template</h1>
            <p className="text-muted-foreground">Build a comprehensive device template with properties and multi-language support</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => console.log(preview)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="global">Global Template</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Template</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name (English)</Label>
                  <Input
                    value={template.name}
                    onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="LED Panel Template"
                  />
                </div>
                <div>
                  <Label>Template Name (Arabic)</Label>
                  <Input
                    value={template.name_ar}
                    onChange={(e) => setTemplate(prev => ({ ...prev, name_ar: e.target.value }))}
                    placeholder="قالب لوحة LED"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Select value={template.brand_id} onValueChange={(value) => setTemplate(prev => ({ ...prev, brand_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={template.category} onValueChange={(value) => setTemplate(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEVICE_CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Description (English)</Label>
                  <Textarea
                    value={template.description}
                    onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Template description in English"
                  />
                </div>
                <div>
                  <Label>Description (Arabic)</Label>
                  <Textarea
                    value={template.description_ar}
                    onChange={(e) => setTemplate(prev => ({ ...prev, description_ar: e.target.value }))}
                    placeholder="وصف القالب بالعربية"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dynamic Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>SKU Formula</Label>
                <Input
                  value={template.sku_formula}
                  onChange={(e) => setTemplate(prev => ({ ...prev, sku_formula: e.target.value }))}
                  placeholder="LED-{wattage}W-{color_temperature}K"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Preview: <Badge variant="outline">{preview.sku || 'Enter formula above'}</Badge>
                </p>
              </div>

              <div>
                <Label>Description Formula</Label>
                <Input
                  value={template.description_formula}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description_formula: e.target.value }))}
                  placeholder="{wattage}W LED Panel - {color_temperature}K"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Preview: <Badge variant="outline">{preview.description || 'Enter formula above'}</Badge>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Properties</CardTitle>
                <Button onClick={addProperty} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {template.properties.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No properties added yet. Click "Add Property" to start.</p>
              ) : (
                <div className="space-y-6">
                  {template.properties.map((property, index) => (
                    <Card key={property.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium">Property {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProperty(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <Label>Property Name</Label>
                            <Input
                              value={property.name}
                              onChange={(e) => updateProperty(index, 'name', e.target.value)}
                              placeholder="wattage"
                            />
                          </div>
                          <div>
                            <Label>Label (English)</Label>
                            <Input
                              value={property.label_en}
                              onChange={(e) => updateProperty(index, 'label_en', e.target.value)}
                              placeholder="Wattage"
                            />
                          </div>
                          <div>
                            <Label>Label (Arabic)</Label>
                            <Input
                              value={property.label_ar}
                              onChange={(e) => updateProperty(index, 'label_ar', e.target.value)}
                              placeholder="القوة الكهربائية"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={property.type}
                              onValueChange={(value) => updateProperty(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROPERTY_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Unit (Optional)</Label>
                            <Input
                              value={property.unit || ''}
                              onChange={(e) => updateProperty(index, 'unit', e.target.value)}
                              placeholder="W, mm, etc."
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <input
                              type="checkbox"
                              checked={property.required}
                              onChange={(e) => updateProperty(index, 'required', e.target.checked)}
                            />
                            <Label>Required</Label>
                          </div>
                          <div className="flex items-center space-x-2 pt-6">
                            <input
                              type="checkbox"
                              checked={property.is_identifier}
                              onChange={(e) => updateProperty(index, 'is_identifier', e.target.checked)}
                            />
                            <Label>For SKU/Description</Label>
                          </div>
                        </div>

                        {(property.type === 'select' || property.type === 'multiselect') && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label>Options</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addPropertyOption(index)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Option
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {property.property_options.map((option, optionIndex) => (
                                <div key={optionIndex} className="flex gap-2 items-center">
                                  <Input
                                    placeholder="Code"
                                    value={option.code}
                                    onChange={(e) => updatePropertyOption(index, optionIndex, 'code', e.target.value)}
                                    className="w-20"
                                  />
                                  <Input
                                    placeholder="English Label"
                                    value={option.label_en}
                                    onChange={(e) => updatePropertyOption(index, optionIndex, 'label_en', e.target.value)}
                                  />
                                  <Input
                                    placeholder="Arabic Label"
                                    value={option.label_ar}
                                    onChange={(e) => updatePropertyOption(index, optionIndex, 'label_ar', e.target.value)}
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removePropertyOption(index, optionIndex)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Tenant-specific templates will be created with the same interface but marked as tenant-specific rather than global.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}