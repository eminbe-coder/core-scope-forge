import React, { useEffect, useState } from 'react';
import { Plus, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
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

export default function DeviceTemplates() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [globalTemplates, setGlobalTemplates] = useState<DeviceTemplate[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

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
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      setGlobalTemplates(data || []);
    } catch (error) {
      console.error('Error loading global templates:', error);
      toast({
        title: "Error",
        description: "Failed to load global templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportTemplates = async () => {
    if (!currentTenant || selectedTemplates.length === 0) {
      toast({
        title: "Error",
        description: "Please select templates to import",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get selected global templates
      const templatesData = globalTemplates.filter(t => selectedTemplates.includes(t.id));
      
      // Create tenant copies
      const tenantTemplates = templatesData.map(template => ({
        name: template.name + ' (Imported)',
        category: template.category,
        description: template.description,
        properties_schema: template.properties_schema,
        is_global: false,
        tenant_id: currentTenant.id,
        active: true
      }));

      const { error } = await supabase
        .from('device_templates')
        .insert(tenantTemplates);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${selectedTemplates.length} template(s) successfully`
      });

      setIsImportDialogOpen(false);
      setSelectedTemplates([]);
    } catch (error: any) {
      console.error('Error importing templates:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to import templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const filteredGlobalTemplates = globalTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Device Templates</h1>
            <p className="text-muted-foreground">
              Manage device templates for your tenant
            </p>
          </div>
          <Button onClick={() => setIsImportDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Import Global Templates
          </Button>
        </div>

        <DeviceTemplatesManager />

        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import Global Templates</DialogTitle>
              <DialogDescription>
                Select global device templates to import to your tenant
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedTemplates.length === filteredGlobalTemplates.length && filteredGlobalTemplates.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTemplates(filteredGlobalTemplates.map(t => t.id));
                            } else {
                              setSelectedTemplates([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGlobalTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTemplates.includes(template.id)}
                            onChange={() => toggleTemplateSelection(template.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{template.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {Object.keys(template.properties_schema || {}).length} properties
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {template.description || 'No description'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedTemplates.length} template(s) selected
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleImportTemplates}
                    disabled={selectedTemplates.length === 0 || loading}
                  >
                    {loading ? 'Importing...' : `Import ${selectedTemplates.length} Template(s)`}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}