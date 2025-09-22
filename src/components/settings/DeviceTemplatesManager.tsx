import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Languages, RefreshCw, Plus, Eye, Edit } from 'lucide-react';
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
  
  // Only show global tab for super admins
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'global' : 'tenant');
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await loadTemplates();
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentTenant, isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'global') {
        // For global tab, show global templates (RLS will handle permissions)
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
          console.error('Error details:', { 
            code: error.code, 
            message: error.message, 
            details: error.details,
            hint: error.hint 
          });
          
          // Provide specific error messages
          let errorMessage = 'Failed to load global templates';
          if (error.code === 'PGRST301') {
            errorMessage = 'Access denied: You may not have permission to view global templates';
          } else if (error.code === '42501') {
            errorMessage = 'Permission denied: Row-level security policy violation';
          } else if (error.message.includes('infinite recursion')) {
            errorMessage = 'Database policy error: Please contact support';
          } else {
            errorMessage = `Failed to load global templates: ${error.message}`;
          }
          
          toast({
            title: "Error Loading Global Templates",
            description: errorMessage,
            variant: "destructive"
          });
          setTemplates([]);
          return;
        }
        
        console.log('Loaded global templates:', data?.length || 0);
        setTemplates(data || []);
      } else {
        // For tenant tab, show tenant-created templates AND imported templates
        if (!currentTenant?.id) {
          console.error('No current tenant found');
          toast({
            title: "Error",
            description: "No tenant selected. Please select a tenant first.",
            variant: "destructive"
          });
          setTemplates([]);
          return;
        }

        const { data, error } = await supabase
          .from('device_templates')
          .select(`
            *,
            device_type:device_types(name),
            template_properties:device_template_properties(*),
            template_options:device_template_options(*)
          `)
          .eq('tenant_id', currentTenant.id)
          .eq('is_global', false)
          .eq('active', true)
          .order('name');
        
        if (error) {
          console.error('Error loading tenant templates:', error);
          console.error('Error details:', { 
            code: error.code, 
            message: error.message, 
            details: error.details,
            hint: error.hint 
          });
          
          // Provide specific error messages
          let errorMessage = 'Failed to load tenant templates';
          if (error.code === 'PGRST301') {
            errorMessage = 'Access denied: You may not have permission to view tenant templates';
          } else if (error.code === '42501') {
            errorMessage = 'Permission denied: Row-level security policy violation';
          } else {
            errorMessage = `Failed to load tenant templates: ${error.message}`;
          }
          
          toast({
            title: "Error Loading Tenant Templates",
            description: errorMessage,
            variant: "destructive"
          });
          setTemplates([]);
          return;
        }
        
        console.log('Loaded tenant templates:', data?.length || 0);
        setTemplates(data || []);
      }
    } catch (error: any) {
      console.error('Unexpected error loading templates:', error);
      toast({
        title: "Unexpected Error",
        description: `An unexpected error occurred: ${error?.message || 'Unknown error'}. Please refresh the page and try again.`,
        variant: "destructive"
      });
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteTemplate = async (templateId: string, template: DeviceTemplate) => {
    // Warn users about imported templates and linked devices
    if (template.source_template_id) {
      const confirmMessage = "Deleting this imported template will remove it and all its linked devices from your tenant. This action cannot be undone.\n\nAre you sure you want to continue?";
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

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

  const handleCloneTemplate = async (template: DeviceTemplate) => {
    try {
      // Create a cloned template (tenant-owned)
      const clonedTemplate = {
        name: `${template.name} (Copy)`,
        category: template.category,
        description: template.description,
        sku_formula: template.sku_formula,
        description_formula: template.description_formula,
        device_type_id: template.device_type_id,
        tenant_id: currentTenant!.id,
        is_global: false,
        active: true,
        created_by: user!.id,
        source_template_id: null, // Cloned templates are independent
        supports_multilang: template.supports_multilang
      };

      const { data: newTemplate, error } = await supabase
        .from('device_templates')
        .insert(clonedTemplate)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Template '${template.name}' cloned successfully as '${clonedTemplate.name}'`
      });

      loadTemplates();
    } catch (error) {
      console.error('Error cloning template:', error);
      toast({
        title: "Error",
        description: "Failed to clone template",
        variant: "destructive"
      });
    }
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
    if (template.source_template_id) {
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
        isReadOnly: isSuperAdmin ? false : true // Global templates are read-only for non-super-admins
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
        {activeTab === 'tenant' && (
          <Button onClick={() => navigate('/tenant-templates/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Local Template
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {isSuperAdmin && <TabsTrigger value="global">Global Templates</TabsTrigger>}
          <TabsTrigger value="tenant">{isSuperAdmin ? 'Tenant Templates' : 'Templates'}</TabsTrigger>
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
                                      onClick={() => navigate(`/tenant-templates/view/${template.id}`)}
                                      title="View template details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => template.id && handleSyncTemplate(template)}
                                      disabled={syncing === template.id}
                                      title="Sync with global template"
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
                                      onClick={() => template.id && handleCloneTemplate(template)}
                                      title="Clone to create editable copy"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </>
                                );
                              } else if (templateType.isReadOnly) {
                                return (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => template.id && handleCloneTemplate(template)}
                                    title="Clone to create editable copy"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                );
                              } else {
                                return (
                                   <>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => navigate(`/tenant-templates/edit/${template.id}`)}
                                       title="Edit template"
                                     >
                                       <Edit className="h-4 w-4" />
                                     </Button>
                                     <Button
                                       variant="destructive"
                                       size="sm"
                                       onClick={() => template.id && handleDeleteTemplate(template.id, template)}
                                       title="Delete template"
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

    </div>
  );
}