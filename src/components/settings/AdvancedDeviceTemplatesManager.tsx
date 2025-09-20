import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Edit2, Trash2, Eye, Languages, Code, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeviceType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
  is_global: boolean;
  tenant_id?: string;
}

interface DeviceTemplate {
  id?: string;
  tenant_id?: string;
  name: string;
  category: string;
  description?: string;
  label_ar?: string;
  is_global: boolean;
  supports_multilang?: boolean;
  sku_generation_type?: string;
  sku_formula?: string;
  description_generation_type?: string;
  description_formula?: string;
  created_by?: string;
  active: boolean;
  properties?: DeviceTemplateProperty[];
  options?: DeviceTemplateOption[];
}

interface DeviceTemplateProperty {
  id?: string;
  template_id?: string;
  property_name: string;
  property_type: string;
  label_en: string;
  label_ar?: string;
  property_unit?: string;
  is_required: boolean;
  is_identifier?: boolean;
  sort_order: number;
}

interface DeviceTemplateOption {
  id?: string;
  template_id?: string;
  tenant_id?: string;
  code: string;
  label_en: string;
  label_ar?: string;
  unit?: string;
  data_type: string;
  sort_order: number;
  active: boolean;
}

const PROPERTY_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'mixed', label: 'Mixed' }
];

const DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'mixed', label: 'Mixed' }
];

export function AdvancedDeviceTemplatesManager() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('global');
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DeviceTemplate | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<DeviceTemplate>({
    name: '',
    category: '',
    description: '',
    label_ar: '',
    is_global: activeTab === 'global',
    supports_multilang: false,
    sku_generation_type: 'fixed',
    sku_formula: '',
    description_generation_type: 'fixed',
    description_formula: '',
    active: true,
    properties: [],
    options: []
  });

  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>('en');
  const [skuPreview, setSkuPreview] = useState('');
  const [descriptionPreview, setDescriptionPreview] = useState('');

  useEffect(() => {
    loadDeviceTypes();
    loadTemplates();
  }, [activeTab]);

  const loadDeviceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('device_types')
        .select('*')
        .eq('active', true)
        .order('sort_order');

      if (error) throw error;
      setDeviceTypes(data || []);
    } catch (error) {
      console.error('Error loading device types:', error);
      toast({
        title: "Error",
        description: "Failed to load device types",
        variant: "destructive",
      });
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data: templatesData, error } = await supabase
        .from('device_templates')
        .select('*')
        .eq('is_global', activeTab === 'global')
        .eq('active', true)
        .order('name');

      if (error) throw error;

      // Load properties and options for each template
      const templatesWithDetails = await Promise.all(
        (templatesData || []).map(async (template) => {
          const [propertiesResult, optionsResult] = await Promise.all([
            supabase
              .from('device_template_properties')
              .select('*')
              .eq('template_id', template.id)
              .order('sort_order'),
            supabase
              .from('device_template_options')
              .select('*')
              .eq('template_id', template.id)
              .order('sort_order')
          ]);

          return {
            ...template,
            properties: propertiesResult.data || [],
            options: optionsResult.data || []
          };
        })
      );

      setTemplates(templatesWithDetails);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const templateData = {
        ...formData,
        tenant_id: formData.is_global ? null : undefined
      };

      let templateId = editingTemplate?.id;

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('device_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        // Create new template
        const { data, error } = await supabase
          .from('device_templates')
          .insert([templateData])
          .select()
          .single();

        if (error) throw error;
        templateId = data.id;
      }

      // Save properties
      if (templateId && formData.properties) {
        // Delete existing properties
        await supabase
          .from('device_template_properties')
          .delete()
          .eq('template_id', templateId);

        // Insert new properties
        if (formData.properties.length > 0) {
          const propertiesData = formData.properties.map(prop => ({
            ...prop,
            template_id: templateId
          }));

          const { error: propsError } = await supabase
            .from('device_template_properties')
            .insert(propertiesData);

          if (propsError) throw propsError;
        }
      }

      // Save options
      if (templateId && formData.options) {
        // Delete existing options
        await supabase
          .from('device_template_options')
          .delete()
          .eq('template_id', templateId);

        // Insert new options
        if (formData.options.length > 0) {
          const optionsData = formData.options.map(option => ({
            ...option,
            template_id: templateId,
            tenant_id: formData.is_global ? null : undefined
          }));

          const { error: optionsError } = await supabase
            .from('device_template_options')
            .insert(optionsData);

          if (optionsError) throw optionsError;
        }
      }

      toast({
        title: "Success",
        description: `Template ${editingTemplate ? 'updated' : 'created'} successfully`,
      });

      setDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    }
  };

  const handleEditTemplate = (template: DeviceTemplate) => {
    setEditingTemplate(template);
    setFormData({
      ...template,
      properties: template.properties || [],
      options: template.options || []
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      label_ar: '',
      is_global: activeTab === 'global',
      supports_multilang: false,
      sku_generation_type: 'fixed',
      sku_formula: '',
      description_generation_type: 'fixed',
      description_formula: '',
      active: true,
      properties: [],
      options: []
    });
    setEditingTemplate(null);
  };

  const addProperty = () => {
    const newProperty: DeviceTemplateProperty = {
      property_name: '',
      property_type: 'text',
      label_en: '',
      label_ar: '',
      property_unit: '',
      is_required: false,
      is_identifier: false,
      sort_order: formData.properties?.length || 0
    };
    setFormData(prev => ({
      ...prev,
      properties: [...(prev.properties || []), newProperty]
    }));
  };

  const updateProperty = (index: number, updates: Partial<DeviceTemplateProperty>) => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties?.map((prop, i) => 
        i === index ? { ...prop, ...updates } : prop
      ) || []
    }));
  };

  const removeProperty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties?.filter((_, i) => i !== index) || []
    }));
  };

  const addOption = () => {
    const newOption: DeviceTemplateOption = {
      code: '',
      label_en: '',
      label_ar: '',
      unit: '',
      data_type: 'text',
      sort_order: formData.options?.length || 0,
      active: true
    };
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption]
    }));
  };

  const updateOption = (index: number, updates: Partial<DeviceTemplateOption>) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.map((option, i) => 
        i === index ? { ...option, ...updates } : option
      ) || []
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const generatePreview = () => {
    if (formData.sku_generation_type === 'dynamic' && formData.sku_formula) {
      // Simple formula evaluation for preview
      let preview = formData.sku_formula;
      formData.properties?.forEach(prop => {
        if (prop.property_name) {
          preview = preview.replace(new RegExp(`{${prop.property_name}}`, 'g'), `[${prop.property_name}]`);
        }
      });
      formData.options?.forEach(option => {
        if (option.code) {
          preview = preview.replace(new RegExp(`{${option.code}}`, 'g'), `[${option.code}]`);
        }
      });
      setSkuPreview(preview);
    } else {
      setSkuPreview('Fixed SKU');
    }

    if (formData.description_generation_type === 'dynamic' && formData.description_formula) {
      let preview = formData.description_formula;
      formData.properties?.forEach(prop => {
        if (prop.property_name) {
          preview = preview.replace(new RegExp(`{${prop.property_name}}`, 'g'), `[${prop.property_name}]`);
        }
      });
      formData.options?.forEach(option => {
        if (option.code) {
          preview = preview.replace(new RegExp(`{${option.code}}`, 'g'), `[${option.code}]`);
        }
      });
      setDescriptionPreview(preview);
    } else {
      setDescriptionPreview('Fixed Description');
    }
  };

  useEffect(() => {
    generatePreview();
  }, [formData.sku_formula, formData.description_formula, formData.properties, formData.options]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Advanced Device Templates Manager
        </CardTitle>
        <CardDescription>
          Create and manage device templates with multi-language support, dynamic SKU generation, and independent options
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="global">Global Templates</TabsTrigger>
            <TabsTrigger value="tenant">Tenant Templates</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {activeTab === 'global' ? 'Global Templates' : 'Tenant Templates'}
              </h3>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? 'Edit Template' : 'Create New Template'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure template properties, options, and generation settings
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter template name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {deviceTypes.map((type) => (
                              <SelectItem key={type.id} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Multi-language Support */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="multilang"
                        checked={formData.supports_multilang}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, supports_multilang: checked }))}
                      />
                      <Label htmlFor="multilang" className="flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        Enable Multi-language Support (Arabic/English)
                      </Label>
                    </div>

                    {formData.supports_multilang && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name_en">Template Name (English)</Label>
                          <Input
                            id="name_en"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter English name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="name_ar">Template Name (Arabic)</Label>
                          <Input
                            id="name_ar"
                            value={formData.label_ar || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, label_ar: e.target.value }))}
                            placeholder="أدخل الاسم باللغة العربية"
                            dir="rtl"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter template description"
                      />
                    </div>

                    <Separator />

                    {/* Dynamic Generation Settings */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Dynamic Generation Settings
                      </h4>
                      
                      {/* SKU Generation */}
                      <div className="space-y-2">
                        <Label>SKU Generation</Label>
                        <Select 
                          value={formData.sku_generation_type} 
                          onValueChange={(value: 'fixed' | 'dynamic') => setFormData(prev => ({ ...prev, sku_generation_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed SKU</SelectItem>
                            <SelectItem value="dynamic">Dynamic SKU (Formula-based)</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {formData.sku_generation_type === 'dynamic' && (
                          <div className="space-y-2">
                            <Label>SKU Formula</Label>
                            <Input
                              value={formData.sku_formula || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, sku_formula: e.target.value }))}
                              placeholder="e.g., {brand}-{model}-{color}"
                            />
                            <div className="text-sm text-muted-foreground">
                              Preview: <Badge variant="outline">{skuPreview}</Badge>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Description Generation */}
                      <div className="space-y-2">
                        <Label>Description Generation</Label>
                        <Select 
                          value={formData.description_generation_type} 
                          onValueChange={(value: 'fixed' | 'dynamic') => setFormData(prev => ({ ...prev, description_generation_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Description</SelectItem>
                            <SelectItem value="dynamic">Dynamic Description (Formula-based)</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {formData.description_generation_type === 'dynamic' && (
                          <div className="space-y-2">
                            <Label>Description Formula</Label>
                            <Textarea
                              value={formData.description_formula || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, description_formula: e.target.value }))}
                              placeholder="e.g., {brand} {model} in {color} color"
                            />
                            <div className="text-sm text-muted-foreground">
                              Preview: <Badge variant="outline">{descriptionPreview}</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Properties and Options Management */}
                    <Tabs defaultValue="properties">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="properties">Properties</TabsTrigger>
                        <TabsTrigger value="options">Options</TabsTrigger>
                      </TabsList>

                      <TabsContent value="properties" className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-medium">Template Properties</h4>
                          <Button type="button" variant="outline" onClick={addProperty}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Property
                          </Button>
                        </div>

                        {formData.properties?.map((property, index) => (
                          <Card key={index} className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Property Name</Label>
                                <Input
                                  value={property.property_name}
                                  onChange={(e) => updateProperty(index, { property_name: e.target.value })}
                                  placeholder="e.g., brand, model, color"
                                />
                              </div>
                              <div>
                                <Label>Property Type</Label>
                                <Select 
                                  value={property.property_type} 
                                  onValueChange={(value: any) => updateProperty(index, { property_type: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PROPERTY_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {formData.supports_multilang ? (
                                <>
                                  <div>
                                    <Label>Label (English)</Label>
                                    <Input
                                      value={property.label_en}
                                      onChange={(e) => updateProperty(index, { label_en: e.target.value })}
                                      placeholder="English label"
                                    />
                                  </div>
                                  <div>
                                    <Label>Label (Arabic)</Label>
                                    <Input
                                      value={property.label_ar || ''}
                                      onChange={(e) => updateProperty(index, { label_ar: e.target.value })}
                                      placeholder="التسمية باللغة العربية"
                                      dir="rtl"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <Label>Label</Label>
                                  <Input
                                    value={property.label_en}
                                    onChange={(e) => updateProperty(index, { label_en: e.target.value })}
                                    placeholder="Property label"
                                  />
                                </div>
                              )}

                              <div>
                                <Label>Unit</Label>
                                <Input
                                  value={property.property_unit || ''}
                                  onChange={(e) => updateProperty(index, { property_unit: e.target.value })}
                                  placeholder="e.g., cm, kg, inches"
                                />
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={property.is_required}
                                    onCheckedChange={(checked) => updateProperty(index, { is_required: checked })}
                                  />
                                  <Label>Required</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={property.is_identifier || false}
                                    onCheckedChange={(checked) => updateProperty(index, { is_identifier: checked })}
                                  />
                                  <Label>Identifier</Label>
                                </div>
                                <Button 
                                  type="button" 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => removeProperty(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </TabsContent>

                      <TabsContent value="options" className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-medium">Template Options</h4>
                          <Button type="button" variant="outline" onClick={addOption}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Option
                          </Button>
                        </div>

                        {formData.options?.map((option, index) => (
                          <Card key={index} className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Option Code</Label>
                                <Input
                                  value={option.code}
                                  onChange={(e) => updateOption(index, { code: e.target.value })}
                                  placeholder="e.g., RED, BLU, LRG"
                                />
                              </div>
                              <div>
                                <Label>Data Type</Label>
                                <Select 
                                  value={option.data_type} 
                                  onValueChange={(value: any) => updateOption(index, { data_type: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DATA_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {formData.supports_multilang ? (
                                <>
                                  <div>
                                    <Label>Label (English)</Label>
                                    <Input
                                      value={option.label_en}
                                      onChange={(e) => updateOption(index, { label_en: e.target.value })}
                                      placeholder="English label"
                                    />
                                  </div>
                                  <div>
                                    <Label>Label (Arabic)</Label>
                                    <Input
                                      value={option.label_ar || ''}
                                      onChange={(e) => updateOption(index, { label_ar: e.target.value })}
                                      placeholder="التسمية باللغة العربية"
                                      dir="rtl"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <Label>Label</Label>
                                  <Input
                                    value={option.label_en}
                                    onChange={(e) => updateOption(index, { label_en: e.target.value })}
                                    placeholder="Option label"
                                  />
                                </div>
                              )}

                              <div>
                                <Label>Unit</Label>
                                <Input
                                  value={option.unit || ''}
                                  onChange={(e) => updateOption(index, { unit: e.target.value })}
                                  placeholder="e.g., cm, kg, inches"
                                />
                              </div>
                              <div className="flex items-center justify-end">
                                <Button 
                                  type="button" 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => removeOption(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={handleSaveTemplate}>
                        {editingTemplate ? 'Update Template' : 'Create Template'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : (
              <div className="space-y-4">
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No templates found. Create your first template to get started.
                  </div>
                ) : (
                  templates.map((template) => (
                    <Card key={template.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{template.name}</h3>
                              {template.supports_multilang && (
                                <Badge variant="secondary">
                                  <Languages className="h-3 w-3 mr-1" />
                                  Multi-lang
                                </Badge>
                              )}
                              {template.sku_generation_type === 'dynamic' && (
                                <Badge variant="outline">
                                  <Code className="h-3 w-3 mr-1" />
                                  Dynamic SKU
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Category: {template.category} • Properties: {template.properties?.length || 0} • Options: {template.options?.length || 0}
                            </p>
                            {template.description && (
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}