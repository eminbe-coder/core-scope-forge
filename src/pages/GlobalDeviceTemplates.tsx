import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import DeviceTemplatesManager from '@/components/settings/DeviceTemplatesManager';

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

export default function GlobalDeviceTemplates() {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadGlobalTemplates();
  }, []);

  const loadGlobalTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('device_templates')
        .select('*')
        .eq('is_global', true)
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

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this global template?')) return;

    try {
      const { error } = await supabase
        .from('device_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Global template deleted successfully"
      });
      
      loadGlobalTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive"
      });
    }
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
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
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
                        {new Date(template.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
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

        {/* Template Management Component - Filtered for Global Only */}
        <div className="mt-8">
          <DeviceTemplatesManager />
        </div>
      </div>
    </DashboardLayout>
  );
}