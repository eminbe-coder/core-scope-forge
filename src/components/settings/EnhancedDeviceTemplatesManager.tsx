import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, X, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';

interface DeviceType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
  is_global: boolean;
}

interface DeviceTemplateProperty {
  name: string;
  type: 'text' | 'number';
  required: boolean;
  property_unit?: string;
  is_identifier: boolean;
  options: PropertyOption[];
}

interface PropertyOption {
  code: string;
  label: string;
  unit?: string;
}

interface DeviceTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  properties_schema: DeviceTemplateProperty[];
  is_global: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

const PROPERTY_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
];

export function EnhancedDeviceTemplatesManager() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('global');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DeviceTemplate | null>(null);
  const [templateProperties, setTemplateProperties] = useState<DeviceTemplateProperty[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    is_global: activeTab === 'global',
  });

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
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setDeviceTypes(data || []);
    } catch (error) {
      console.error('Error loading device types:', error);
      toast.error('Failed to load device types');
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('device_templates')
        .select('*')
        .order('name', { ascending: true });

      if (activeTab === 'global') {
        query = query.eq('is_global', true);
      } else {
        query = query.eq('is_global', false).eq('tenant_id', currentTenant?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTemplates((data || []).map(template => ({
        ...template,
        properties_schema: Array.isArray(template.properties_schema) 
          ? (template.properties_schema as unknown as DeviceTemplateProperty[])
          : []
      })));
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateProperties = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('device_template_properties')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      const properties: DeviceTemplateProperty[] = (data || []).map(prop => ({
        name: prop.property_name,
        type: prop.property_type as 'text' | 'number',
        required: prop.is_required,
        property_unit: prop.property_unit || undefined,
        is_identifier: prop.is_identifier || false,
        options: prop.property_options ? parsePropertyOptions(prop.property_options) : [],
      }));

      setTemplateProperties(properties);
    } catch (error) {
      console.error('Error loading template properties:', error);
      toast.error('Failed to load template properties');
    }
  };

  const parsePropertyOptions = (options: any): PropertyOption[] => {
    if (!options) return [];
    if (Array.isArray(options)) {
      // Handle old format: ["Red", "Blue"] or new format: [{code, label, unit}]
      return options.map(option => {
        if (typeof option === 'string') {
          return { code: option, label: option };
        }
        return option;
      });
    }
    return [];
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    if (!formData.category) {
      toast.error('Template type is required');
      return;
    }

    // Validate identifier property (only one allowed)
    const identifierProperties = templateProperties.filter(p => p.is_identifier);
    if (identifierProperties.length > 1) {
      toast.error('Only one property can be marked as identifier');
      return;
    }

    try {
      const templateData = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || null,
        properties_schema: JSON.stringify(templateProperties),
        is_global: formData.is_global,
        tenant_id: formData.is_global ? null : currentTenant?.id,
      };

      let templateId: string;

      if (editingTemplate) {
        // Update existing template
        const { error: templateError } = await supabase
          .from('device_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (templateError) throw templateError;
        templateId = editingTemplate.id;

        // Delete existing properties
        const { error: deleteError } = await supabase
          .from('device_template_properties')
          .delete()
          .eq('template_id', templateId);

        if (deleteError) throw deleteError;
      } else {
        // Create new template
        const { data: newTemplate, error: templateError } = await supabase
          .from('device_templates')
          .insert(templateData)
          .select()
          .single();

        if (templateError) throw templateError;
        templateId = newTemplate.id;
      }

      // Insert properties
      if (templateProperties.length > 0) {
        const propertiesData = templateProperties.map((prop, index) => ({
          template_id: templateId,
          property_name: prop.name,
          property_type: prop.type,
          is_required: prop.required,
          property_unit: prop.property_unit || null,
          is_identifier: prop.is_identifier,
          property_options: prop.options.length > 0 ? JSON.stringify(prop.options) : null,
          sort_order: index,
        }));

        const { error: propertiesError } = await supabase
          .from('device_template_properties')
          .insert(propertiesData);

        if (propertiesError) throw propertiesError;
      }

      toast.success(editingTemplate ? 'Template updated successfully' : 'Template created successfully');
      setIsDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleEditTemplate = async (template: DeviceTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      description: template.description || '',
      is_global: template.is_global,
    });
    await loadTemplateProperties(template.id);
    setIsDialogOpen(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('device_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: '',
      description: '',
      is_global: activeTab === 'global',
    });
    setTemplateProperties([]);
  };

  const addProperty = () => {
    setTemplateProperties([
      ...templateProperties,
      {
        name: '',
        type: 'text',
        required: false,
        is_identifier: false,
        options: [],
      },
    ]);
  };

  const updateProperty = (index: number, updates: Partial<DeviceTemplateProperty>) => {
    const updated = [...templateProperties];
    updated[index] = { ...updated[index], ...updates };
    
    // If setting as identifier, unset others
    if (updates.is_identifier) {
      updated.forEach((prop, i) => {
        if (i !== index) prop.is_identifier = false;
      });
    }
    
    setTemplateProperties(updated);
  };

  const removeProperty = (index: number) => {
    setTemplateProperties(templateProperties.filter((_, i) => i !== index));
  };

  const addPropertyOption = (propertyIndex: number) => {
    const updated = [...templateProperties];
    updated[propertyIndex].options.push({ code: '', label: '' });
    setTemplateProperties(updated);
  };

  const updatePropertyOption = (propertyIndex: number, optionIndex: number, updates: Partial<PropertyOption>) => {
    const updated = [...templateProperties];
    updated[propertyIndex].options[optionIndex] = {
      ...updated[propertyIndex].options[optionIndex],
      ...updates,
    };
    setTemplateProperties(updated);
  };

  const removePropertyOption = (propertyIndex: number, optionIndex: number) => {
    const updated = [...templateProperties];
    updated[propertyIndex].options.splice(optionIndex, 1);
    setTemplateProperties(updated);
  };

  if (loading) {
    return <div className="p-6">Loading templates...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enhanced Device Templates</CardTitle>
        <CardDescription>
          Create and manage device templates with properties, units, and options for structured device data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="global">Global Templates</TabsTrigger>
              <TabsTrigger value="tenant">Tenant Templates</TabsTrigger>
            </TabsList>
            <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Template
            </Button>
          </div>

          <TabsContent value="global">
            <TemplatesList 
              templates={templates.filter(t => t.is_global)} 
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              title="Global Templates"
              description="Templates available to all tenants"
            />
          </TabsContent>

          <TabsContent value="tenant">
            <TemplatesList 
              templates={templates.filter(t => !t.is_global)} 
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              title="Tenant Templates"
              description="Templates specific to this tenant"
            />
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </DialogTitle>
              <DialogDescription>
                Define template structure with properties, units, and options.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. LED Panel Light"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Device Type *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
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

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Template description"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_global"
                  checked={formData.is_global}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_global: checked as boolean })}
                />
                <Label htmlFor="is_global">Global Template (available to all tenants)</Label>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium">Template Properties</h4>
                  <Button onClick={addProperty} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                </div>

                {templateProperties.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No properties defined. Add properties to structure your device data.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templateProperties.map((property, index) => (
                      <PropertyEditor
                        key={index}
                        property={property}
                        index={index}
                        onUpdate={updateProperty}
                        onRemove={removeProperty}
                        onAddOption={addPropertyOption}
                        onUpdateOption={updatePropertyOption}
                        onRemoveOption={removePropertyOption}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface TemplatesListProps {
  templates: DeviceTemplate[];
  onEdit: (template: DeviceTemplate) => void;
  onDelete: (id: string) => void;
  title: string;
  description: string;
}

function TemplatesList({ templates, onEdit, onDelete, title, description }: TemplatesListProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{title} ({templates.length})</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No templates found. Create your first template to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Properties</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{template.category}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {template.properties_schema?.length || 0} properties
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {template.description || 'No description'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(template)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(template.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

interface PropertyEditorProps {
  property: DeviceTemplateProperty;
  index: number;
  onUpdate: (index: number, updates: Partial<DeviceTemplateProperty>) => void;
  onRemove: (index: number) => void;
  onAddOption: (propertyIndex: number) => void;
  onUpdateOption: (propertyIndex: number, optionIndex: number, updates: Partial<PropertyOption>) => void;
  onRemoveOption: (propertyIndex: number, optionIndex: number) => void;
}

function PropertyEditor({
  property,
  index,
  onUpdate,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: PropertyEditorProps) {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div className="space-y-2">
              <Label>Property Name *</Label>
              <Input
                value={property.name}
                onChange={(e) => onUpdate(index, { name: e.target.value })}
                placeholder="e.g. CRI, Power, SKU"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={property.type}
                onValueChange={(value) => onUpdate(index, { type: value as 'text' | 'number' })}
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
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                value={property.property_unit || ''}
                onChange={(e) => onUpdate(index, { property_unit: e.target.value })}
                placeholder="e.g. Ra, K, W, mm"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${index}`}
              checked={property.required}
              onCheckedChange={(checked) => onUpdate(index, { required: checked as boolean })}
            />
            <Label htmlFor={`required-${index}`}>Required</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`identifier-${index}`}
              checked={property.is_identifier}
              onCheckedChange={(checked) => onUpdate(index, { is_identifier: checked as boolean })}
            />
            <Label htmlFor={`identifier-${index}`}>Use as Identifier</Label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Options (for dropdown selections)</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddOption(index)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          </div>
          {property.options.length > 0 && (
            <div className="space-y-2">
              {property.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <Input
                    placeholder="Code (e.g. B1)"
                    value={option.code}
                    onChange={(e) => onUpdateOption(index, optionIndex, { code: e.target.value })}
                    className="w-24"
                  />
                  <Input
                    placeholder="Label (e.g. Black)"
                    value={option.label}
                    onChange={(e) => onUpdateOption(index, optionIndex, { label: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Unit (optional)"
                    value={option.unit || ''}
                    onChange={(e) => onUpdateOption(index, optionIndex, { unit: e.target.value })}
                    className="w-20"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveOption(index, optionIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}