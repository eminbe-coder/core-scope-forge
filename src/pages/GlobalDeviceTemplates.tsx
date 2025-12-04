import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';

interface DeviceType {
  id: string;
  name: string;
}

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
  deleted_at?: string;
  device_type_id?: string;
  device_type?: DeviceType;
}

export default function GlobalDeviceTemplates() {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DeviceTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadGlobalTemplates();
  }, []);

  const loadGlobalTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('device_templates')
        .select(`
          *,
          device_type:device_types(id, name)
        `)
        .eq('is_global', true)
        .eq('active', true)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading global templates:', error);
      toast({
        title: "Error",
        description: "Failed to load global device templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (templateId: string) => {
    navigate(`/device-templates/create?edit=${templateId}&global=true`);
  };

  const handleDelete = (template: DeviceTemplate) => {
    setTemplateToDelete(template);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      setDeleting(true);
      const { error } = await supabase
        .from('device_templates')
        .update({ active: false, deleted_at: new Date().toISOString() })
        .eq('id', templateToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Template deleted successfully"
      });
      
      loadGlobalTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
    }
  };

  const getPropertiesCount = (schema: any) => {
    if (!schema) return 0;
    if (Array.isArray(schema)) return schema.length;
    if (typeof schema === 'object') return Object.keys(schema).length;
    return 0;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Global Device Templates</h1>
            <p className="text-muted-foreground">
              Manage global device templates available to all tenants
            </p>
          </div>
          <Button onClick={() => navigate('/device-templates/create?global=true')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Global Template Overview</CardTitle>
            <CardDescription>
              Templates available to all tenants across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading global templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No global templates found. Create your first template to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <Badge variant="outline">
                          {template.device_type?.name || template.category || 'Uncategorized'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getPropertiesCount(template.properties_schema)} properties
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.active ? "default" : "secondary"}>
                          {template.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(template.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(template.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(template)}
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
      </div>

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Template"
        description={`Are you sure you want to delete "${templateToDelete?.name}"? This action cannot be undone.`}
        isDeleting={deleting}
      />
    </DashboardLayout>
  );
}
