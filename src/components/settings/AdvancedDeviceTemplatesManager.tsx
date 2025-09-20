import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('global');
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DeviceTemplate | null>(null);
  
  // Form state for editing only
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
        tenant_id: formData.is_global ? null : undefined,
        category: formData.category // Map device type name to category for now
      };

      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('device_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;

        // Save properties and options
        const templateId = editingTemplate.id;
        
        // Save properties
        if (templateId && formData.properties) {
          await supabase.from('device_template_properties').delete().eq('template_id', templateId);
          
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
          await supabase.from('device_template_options').delete().eq('template_id', templateId);
          
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
      }

      toast({
        title: "Success",
        description: "Template updated successfully",
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
              <Button onClick={() => navigate('/device-templates/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </Button>
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
                              Device Type: {template.category} • Properties: {template.properties?.length || 0} • Options: {template.options?.length || 0}
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

        {/* Edit Template Dialog - Only for editing existing templates */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update template properties, options, and generation settings
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
                  <Label htmlFor="category">Device Type</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select device type" />
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

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Template description"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveTemplate}>
                  Update Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}