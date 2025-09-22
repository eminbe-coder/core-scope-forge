import React, { useState, useEffect, useCallback } from 'react';
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
import { Plus, Edit2, Trash2, Eye, Languages, Code, Sparkles, RefreshCw, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';

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
  short_description_formula?: string;
  short_description_ar_formula?: string;
  description_ar_formula?: string;
  device_type_id?: string;
  created_by?: string;
  template_version?: number;
  last_modified_by?: string;
  active: boolean;
  source_template_id?: string;
  import_status?: string;
  imported_at?: string;
  last_synced_at?: string;
  sync_version?: number;
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

export function DeviceTemplatesManager() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentTenant, isSuperAdmin } = useTenant();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('global');
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DeviceTemplate | null>(null);
  
  const [formData, setFormData] = useState<DeviceTemplate>({
    name: '',
    category: '',
    description: '',
    is_global: false,
    active: true,
    supports_multilang: false,
    sku_generation_type: 'formula',
    description_generation_type: 'formula'
  });
  
  const [templateProperties, setTemplateProperties] = useState<DeviceTemplateProperty[]>([]);
  const [templateOptions, setTemplateOptions] = useState<DeviceTemplateOption[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDeviceTypes(), loadTemplates()]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentTenant]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadDeviceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('device_types')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setDeviceTypes(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load device types",
        variant: "destructive"
      });
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'global') {
        if (isSuperAdmin) {
          // Super admins see all original global templates
          const { data, error } = await supabase
            .from('device_templates')
            .select(`
              *,
              device_type:device_types(name),
              template_properties:device_template_properties(*),
              template_options:device_template_options(*)
            `)
            .eq('is_global', true)
            .eq('active', true)
            .order('name');
          
          if (error) {
            console.error('Error loading global templates:', error);
            toast({
              title: "Error",
              description: `Failed to load global templates: ${error.message}`,
              variant: "destructive"
            });
            return;
          }
          
          setTemplates(data || []);
        } else {
          // Regular users see global templates they can import
          const { data, error } = await supabase
            .from('device_templates')
            .select(`
              *,
              device_type:device_types(name),
              template_properties:device_template_properties(*),
              template_options:device_template_options(*)
            `)
            .eq('is_global', true)
            .eq('active', true)
            .order('name');
          
          if (error) {
            console.error('Error loading global templates:', error);
            toast({
              title: "Error", 
              description: `Failed to load global templates: ${error.message}`,
              variant: "destructive"
            });
            return;
          }
          
          setTemplates(data || []);
        }
      } else {
        // Tenant tab: show only tenant-created templates (exclude imported ones)
        const { data, error } = await supabase
          .from('device_templates')
          .select(`
            *,
            device_type:device_types(name),
            template_properties:device_template_properties(*),
            template_options:device_template_options(*)
          `)
          .eq('tenant_id', currentTenant?.id)
          .eq('is_global', false)
          .eq('active', true)
          .neq('import_status', 'imported')
          .order('name');
        
        if (error) {
          console.error('Error loading tenant templates:', error);
          toast({
            title: "Error",
            description: `Failed to load tenant templates: ${error.message}`,
            variant: "destructive"
          });
          return;
        }
        
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Unexpected error loading templates:', error);
      toast({
        title: "Error",
        description: 'An unexpected error occurred while loading templates. Please try again.',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      is_global: activeTab === 'global',
      active: true,
      supports_multilang: false,
      sku_generation_type: 'formula',
      description_generation_type: 'formula'
    });
    setTemplateProperties([]);
    setTemplateOptions([]);
    setEditingTemplate(null);
  };

  const handleSaveTemplate = async () => {
    try {
      if (!formData.name || !formData.category) {
        toast({
          title: "Validation Error",
          description: "Name and category are required",
          variant: "destructive"
        });
        return;
      }

      const templateData = {
        ...formData,
        tenant_id: formData.is_global ? null : currentTenant?.id,
        created_by: user?.id,
        properties_schema: templateProperties as any
      };

      let result;
      if (editingTemplate) {
        const { data, error } = await supabase
          .from('device_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('device_templates')
          .insert(templateData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      // Save properties and options if template was saved successfully
      if (result?.id) {
        await Promise.all([
          saveTemplateProperties(result.id),
          saveTemplateOptions(result.id)
        ]);
      }

      toast({
        title: "Success",
        description: `Template ${editingTemplate ? 'updated' : 'created'} successfully`
      });

      setDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingTemplate ? 'update' : 'create'} template`,
        variant: "destructive"
      });
    }
  };

  const saveTemplateProperties = async (templateId: string) => {
    if (templateProperties.length === 0) return;

    // Delete existing properties
    await supabase
      .from('device_template_properties')
      .delete()
      .eq('template_id', templateId);

    // Insert new properties
    const properties = templateProperties.map(prop => ({
      ...prop,
      template_id: templateId,
      tenant_id: formData.is_global ? null : currentTenant?.id
    }));

    const { error } = await supabase
      .from('device_template_properties')
      .insert(properties);

    if (error) throw error;
  };

  const saveTemplateOptions = async (templateId: string) => {
    if (templateOptions.length === 0) return;

    // Delete existing options
    await supabase
      .from('device_template_options')
      .delete()
      .eq('template_id', templateId);

    // Insert new options
    const options = templateOptions.map(option => ({
      ...option,
      template_id: templateId,
      tenant_id: formData.is_global ? null : currentTenant?.id
    }));

    const { error } = await supabase
      .from('device_template_options')
      .insert(options);

    if (error) throw error;
  };

  const handleEditTemplate = async (template: DeviceTemplate) => {
    setEditingTemplate(template);
    setFormData(template);
    
    // Load template properties and options
    if (template.id) {
      try {
        const [propertiesRes, optionsRes] = await Promise.all([
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

        if (propertiesRes.error) throw propertiesRes.error;
        if (optionsRes.error) throw optionsRes.error;

        setTemplateProperties(propertiesRes.data || []);
        setTemplateOptions(optionsRes.data || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load template details",
          variant: "destructive"
        });
      }
    }
    
    setDialogOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('device_templates')
        .update({ active: false })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully"
      });

      loadTemplates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const addProperty = () => {
    setTemplateProperties([
      ...templateProperties,
      {
        property_name: '',
        property_type: 'text',
        label_en: '',
        is_required: false,
        is_identifier: false,
        sort_order: templateProperties.length
      }
    ]);
  };

  const updateProperty = (index: number, field: keyof DeviceTemplateProperty, value: any) => {
    const updated = [...templateProperties];
    updated[index] = { ...updated[index], [field]: value };
    setTemplateProperties(updated);
  };

  const removeProperty = (index: number) => {
    setTemplateProperties(templateProperties.filter((_, i) => i !== index));
  };

  const addOption = () => {
    setTemplateOptions([
      ...templateOptions,
      {
        code: '',
        label_en: '',
        data_type: 'text',
        sort_order: templateOptions.length,
        active: true
      }
    ]);
  };

  const updateOption = (index: number, field: keyof DeviceTemplateOption, value: any) => {
    const updated = [...templateOptions];
    updated[index] = { ...updated[index], [field]: value };
    setTemplateOptions(updated);
  };

  const removeOption = (index: number) => {
    setTemplateOptions(templateOptions.filter((_, i) => i !== index));
  };

  const handleSyncTemplate = async (template: DeviceTemplate) => {
    if (!template.source_template_id || !template.id) {
      toast({
        title: "Error",
        description: "Cannot sync template: missing source template ID",
        variant: "destructive"
      });
      return;
    }

    try {
      setSyncing(template.id);

      // Get the source global template
      const { data: sourceTemplate, error: sourceError } = await supabase
        .from('device_templates')
        .select('*')
        .eq('id', template.source_template_id)
        .eq('is_global', true)
        .single();

      if (sourceError) throw sourceError;
      if (!sourceTemplate) {
        throw new Error('Source template not found');
      }

      // Update the imported template with latest data from source
      const { error: updateError } = await supabase
        .from('device_templates')
        .update({
          name: sourceTemplate.name,
          category: sourceTemplate.category,
          description: sourceTemplate.description,
          properties_schema: sourceTemplate.properties_schema,
          sku_formula: sourceTemplate.sku_formula,
          description_formula: sourceTemplate.description_formula,
          device_type_id: sourceTemplate.device_type_id,
          last_synced_at: new Date().toISOString(),
          sync_version: (template.sync_version || 1) + 1
        })
        .eq('id', template.id);

      if (updateError) throw updateError;

      // Sync all devices linked to this template
      await syncTemplateDevices(template.id, template.source_template_id);

      // Log the sync operation
      await supabase
        .from('template_sync_logs')
        .insert({
          tenant_id: currentTenant!.id,
          template_id: template.id,
          source_template_id: template.source_template_id,
          action_type: 'sync',
          status: 'success',
          templates_updated: 1,
          created_by: user!.id,
          notes: `Template '${template.name}' synced successfully`
        });

      toast({
        title: "Success",
        description: `Template '${template.name}' synced successfully`
      });

      loadTemplates();
    } catch (error) {
      console.error('Error syncing template:', error);
      toast({
        title: "Error",
        description: "Failed to sync template",
        variant: "destructive"
      });
    } finally {
      setSyncing(null);
    }
  };

  const syncTemplateDevices = async (tenantTemplateId: string, sourceTemplateId: string) => {
    // Get all devices from the source global template
    const { data: sourceDevices, error: sourceError } = await supabase
      .from('devices')
      .select('*')
      .eq('template_id', sourceTemplateId)
      .eq('active', true)
      .is('tenant_id', null); // Global devices only

    if (sourceError) throw sourceError;
    if (!sourceDevices || sourceDevices.length === 0) return;

    // Get existing imported devices for this template
    const { data: existingDevices, error: existingError } = await supabase
      .from('devices')
      .select('*')
      .eq('template_id', tenantTemplateId)
      .eq('tenant_id', currentTenant!.id)
      .eq('import_status', 'imported');

    if (existingError) throw existingError;

    const existingDeviceMap = new Map(
      (existingDevices || []).map(device => [device.source_device_id, device])
    );

    let devicesAdded = 0;
    let devicesUpdated = 0;

    for (const sourceDevice of sourceDevices) {
      const existingDevice = existingDeviceMap.get(sourceDevice.id);

      if (existingDevice) {
        // Update existing device
        const { error: updateError } = await supabase
          .from('devices')
          .update({
            name: sourceDevice.name,
            category: sourceDevice.category,
            brand: sourceDevice.brand,
            model: sourceDevice.model,
            unit_price: sourceDevice.unit_price,
            specifications: sourceDevice.specifications,
            template_properties: sourceDevice.template_properties,
            last_synced_at: new Date().toISOString(),
            sync_version: (existingDevice.sync_version || 1) + 1
          })
          .eq('id', existingDevice.id);

        if (!updateError) devicesUpdated++;
      } else {
        // Add new device
        const { error: insertError } = await supabase
          .from('devices')
          .insert({
            name: sourceDevice.name,
            category: sourceDevice.category,
            brand: sourceDevice.brand,
            model: sourceDevice.model,
            unit_price: sourceDevice.unit_price,
            specifications: sourceDevice.specifications,
            template_properties: sourceDevice.template_properties,
            template_id: tenantTemplateId,
            tenant_id: currentTenant!.id,
            source_device_id: sourceDevice.id,
            import_status: 'imported',
            imported_at: new Date().toISOString(),
            is_global: false,
            active: true
          });

        if (!insertError) devicesAdded++;
      }
    }

    // Update sync log with device counts
    await supabase
      .from('template_sync_logs')
      .update({
        devices_added: devicesAdded,
        devices_updated: devicesUpdated
      })
      .eq('template_id', tenantTemplateId)
      .order('created_at', { ascending: false })
      .limit(1);
  };

  const getTemplateTypeInfo = (template: DeviceTemplate) => {
    if (template.import_status === 'imported' && template.source_template_id) {
      return {
        type: 'imported',
        badge: 'Imported',
        badgeVariant: 'secondary' as const,
        isReadOnly: true
      };
    } else if (template.is_global && !template.tenant_id) {
      return {
        type: 'global',
        badge: 'Global',
        badgeVariant: 'default' as const,
        isReadOnly: false
      };
    } else {
      return {
        type: 'owned',
        badge: null,
        badgeVariant: null,
        isReadOnly: false
      };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Device Templates</h2>
          <p className="text-muted-foreground">
            Manage device templates and their properties
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="global">Global Templates</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Templates</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardContent className="p-6">
              {loading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates found. Create your first template to get started.
                </div>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{template.name}</h3>
                            {(() => {
                              const templateType = getTemplateTypeInfo(template);
                              return (
                                <>
                                  {templateType.badge && (
                                    <Badge variant={templateType.badgeVariant}>
                                      {templateType.badge}
                                    </Badge>
                                  )}
                                  {template.supports_multilang && (
                                    <Badge variant="outline">
                                      <Languages className="h-3 w-3 mr-1" />Multi-lang
                                    </Badge>
                                  )}
                                  {template.last_synced_at && (
                                    <Badge variant="outline" className="text-xs">
                                      Synced {new Date(template.last_synced_at).toLocaleDateString()}
                                    </Badge>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{template.category}</p>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const templateType = getTemplateTypeInfo(template);
                            
                            if (templateType.type === 'imported') {
                              return (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => template.id && handleSyncTemplate(template)}
                                    disabled={syncing === template.id}
                                  >
                                    {syncing === template.id ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => template.id && handleDeleteTemplate(template.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              );
                            } else {
                              return (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditTemplate(template)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => template.id && handleDeleteTemplate(template.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Configure template details, properties, and generation formulas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Template name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Template description"
              />
            </div>

            {/* Template Properties */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Template Properties</h4>
                <Button type="button" variant="outline" size="sm" onClick={addProperty}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </div>

              {templateProperties.map((property, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">Property {index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProperty(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Property Name</Label>
                      <Input
                        value={property.property_name}
                        onChange={(e) => updateProperty(index, 'property_name', e.target.value)}
                        placeholder="property_name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Label (English)</Label>
                      <Input
                        value={property.label_en}
                        onChange={(e) => updateProperty(index, 'label_en', e.target.value)}
                        placeholder="Display label"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={property.property_type}
                        onValueChange={(value) => updateProperty(index, 'property_type', value)}
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
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={property.is_required}
                        onCheckedChange={(checked) => updateProperty(index, 'is_required', checked)}
                      />
                      <Label>Required</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={property.is_identifier || false}
                        onCheckedChange={(checked) => updateProperty(index, 'is_identifier', checked)}
                      />
                      <Label>Identifier</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Formula Fields */}
            <div className="space-y-4">
              <h4 className="font-medium">Generation Formulas</h4>
              
              <div className="space-y-2">
                <Label htmlFor="sku_formula">SKU Formula</Label>
                <Textarea
                  id="sku_formula"
                  value={formData.sku_formula || ''}
                  onChange={(e) => setFormData({ ...formData, sku_formula: e.target.value })}
                  placeholder="e.g., {device.brand}-{device.model}-{property_name}"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_formula">Description Formula</Label>
                <Textarea
                  id="description_formula"
                  value={formData.description_formula || ''}
                  onChange={(e) => setFormData({ ...formData, description_formula: e.target.value })}
                  placeholder="e.g., {device.name} - {property_name} variant"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}