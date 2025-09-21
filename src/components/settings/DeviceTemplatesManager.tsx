import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Copy, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface DeviceTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  properties_schema: any;
  is_global: boolean;
  tenant_id?: string;
  created_by?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface DeviceTemplateProperty {
  id?: string;
  template_id?: string;
  property_name: string;
  property_type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'color' | 'file';
  property_options: string[];
  is_required: boolean;
  sort_order: number;
}

const DEVICE_CATEGORIES = [
  'LED Light', 'Switch', 'Sensor', 'Camera', 'Speaker', 'Controller', 
  'Motor', 'Display', 'Access Control', 'HVAC', 'Network', 'Power', 'Other'
];

const PROPERTY_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean (Yes/No)' },
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'color', label: 'Color' },
  { value: 'file', label: 'File Upload' }
];

export default function DeviceTemplatesManager() {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<DeviceTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const { toast } = useToast();
  const { currentTenant } = useTenant();

  // Form states
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: '',
    description: '',
    is_global: false // Default to tenant template
  });
  
  const [properties, setProperties] = useState<DeviceTemplateProperty[]>([]);

  useEffect(() => {
    loadTemplates();
  }, [activeTab, currentTenant]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      let query = supabase.from('device_templates').select('*');
      
      if (activeTab === 'global') {
        query = query.eq('is_global', true);
      } else {
        query = query.eq('tenant_id', currentTenant?.id).eq('is_global', false);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load device templates",
        variant: "destructive"
      });
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
        .order('sort_order');
      
      if (error) throw error;
      
      // Map database data to our interface format
      const mappedProperties: DeviceTemplateProperty[] = (data || []).map(prop => ({
        id: prop.id,
        template_id: prop.template_id,
        property_name: prop.property_name,
        property_type: prop.property_type as DeviceTemplateProperty['property_type'],
        property_options: Array.isArray(prop.property_options) 
          ? prop.property_options.map(opt => String(opt)) 
          : [],
        is_required: prop.is_required,
        sort_order: prop.sort_order
      }));
      
      setProperties(mappedProperties);
    } catch (error) {
      console.error('Error loading template properties:', error);
      toast({
        title: "Error",
        description: "Failed to load template properties",
        variant: "destructive"
      });
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const templateData = {
        ...templateForm,
        tenant_id: templateForm.is_global ? null : currentTenant?.id,
        properties_schema: properties.reduce((acc, prop) => {
          acc[prop.property_name] = {
            type: prop.property_type,
            required: prop.is_required,
            options: prop.property_options
          };
          return acc;
        }, {} as any)
      };

      let savedTemplate;
      if (selectedTemplate) {
        const { data, error } = await supabase
          .from('device_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id)
          .select()
          .single();
        
        if (error) throw error;
        savedTemplate = data;
      } else {
        const { data, error } = await supabase
          .from('device_templates')
          .insert(templateData)
          .select()
          .single();
        
        if (error) throw error;
        savedTemplate = data;
      }

      // Save properties
      if (selectedTemplate) {
        await supabase
          .from('device_template_properties')
          .delete()
          .eq('template_id', selectedTemplate.id);
      }

      if (properties.length > 0) {
        const propertyData = properties.map((prop, index) => ({
          template_id: savedTemplate.id,
          property_name: prop.property_name,
          property_type: prop.property_type,
          property_options: prop.property_options,
          is_required: prop.is_required,
          sort_order: index,
          label_en: prop.property_name // Use property_name as default label
        }));

        const { error: propError } = await supabase
          .from('device_template_properties')
          .insert(propertyData);
        
        if (propError) throw propError;
      }

      toast({
        title: "Success",
        description: `Template ${selectedTemplate ? 'updated' : 'created'} successfully`
      });

      resetForm();
      setIsDialogOpen(false);
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const handleEditTemplate = async (template: DeviceTemplate) => {
    setSelectedTemplate(template);
    setTemplateForm({
      name: template.name,
      category: template.category,
      description: template.description || '',
      is_global: template.is_global
    });
    await loadTemplateProperties(template.id);
    setIsDialogOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('device_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Template deleted successfully"
      });
      
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive"
      });
    }
  };

  const addProperty = () => {
    setProperties([...properties, {
      property_name: '',
      property_type: 'text',
      property_options: [],
      is_required: false,
      sort_order: properties.length
    }]);
  };

  const updateProperty = (index: number, field: keyof DeviceTemplateProperty, value: any) => {
    const updated = [...properties];
    updated[index] = { ...updated[index], [field]: value };
    setProperties(updated);
  };

  const removeProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setTemplateForm({
      name: '',
      category: '',
      description: '',
      is_global: false // Default to tenant template
    });
    setProperties([]);
    setSelectedTemplate(null);
  };

  const handleNewTemplate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Device Templates</h2>
          <p className="text-muted-foreground">
            Manage device templates for consistent device properties across the platform
          </p>
        </div>
        <Button onClick={handleNewTemplate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="global">Global Templates</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Device Templates</CardTitle>
              <CardDescription>
                Templates available to all tenants across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {Object.keys(template.properties_schema || {}).length} properties
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.active ? "default" : "secondary"}>
                            {template.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Device Templates</CardTitle>
              <CardDescription>
                Custom templates created by individual tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tenant templates found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {Object.keys(template.properties_schema || {}).length} properties
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Tenant</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              Configure device template properties and settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                  placeholder="Enter template name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-category">Category</Label>
                <Select
                  value={templateForm.category}
                  onValueChange={(value) => setTemplateForm({...templateForm, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={templateForm.description}
                onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                placeholder="Enter template description"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-global"
                checked={templateForm.is_global}
                onCheckedChange={(checked) => setTemplateForm({...templateForm, is_global: checked})}
              />
              <Label htmlFor="is-global">Make this template globally available</Label>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Template Properties</Label>
                <Button onClick={addProperty} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>

              {properties.map((property, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-3">
                      <Label>Property Name</Label>
                      <Input
                        value={property.property_name}
                        onChange={(e) => updateProperty(index, 'property_name', e.target.value)}
                        placeholder="e.g., Color, Wattage"
                      />
                    </div>
                    
                    <div className="col-span-2">
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

                    {property.property_type === 'select' && (
                      <div className="col-span-4">
                        <Label>Options (comma-separated)</Label>
                        <Input
                          value={property.property_options.join(', ')}
                          onChange={(e) => updateProperty(index, 'property_options', e.target.value.split(',').map(s => s.trim()))}
                          placeholder="Red, Blue, Green"
                        />
                      </div>
                    )}

                    <div className={`${property.property_type === 'select' ? 'col-span-2' : 'col-span-6'} flex items-center space-x-4`}>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={property.is_required}
                          onCheckedChange={(checked) => updateProperty(index, 'is_required', checked)}
                        />
                        <Label className="text-sm">Required</Label>
                      </div>
                      
                      <Button
                        onClick={() => removeProperty(index)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate}>
                {selectedTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}