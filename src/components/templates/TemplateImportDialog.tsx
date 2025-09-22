import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { Search, AlertTriangle, CheckCircle, Download, Loader2 } from 'lucide-react';

interface GlobalTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  properties_schema?: any;
  sku_formula?: string;
  description_formula?: string;
  device_type_id?: string;
  is_global: boolean;
  created_at: string;
}

interface GlobalDevice {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  unit_price?: number;
  template_id?: string;
  is_global: boolean;
  identity_hash?: string;
}

interface ImportConflict {
  device_id: string;
  device_name: string;
  conflict_reason: string;
  existing_device_name?: string;
}

interface ImportResult {
  templates_imported: number;
  devices_imported: number;
  devices_skipped: number;
  conflicts: ImportConflict[];
  log_id: string;
}

interface TemplateImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function TemplateImportDialog({ open, onOpenChange, onImportComplete }: TemplateImportDialogProps) {
  const { currentTenant } = useTenant();
  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'select' | 'importing' | 'results'>('select');

  useEffect(() => {
    if (open) {
      loadGlobalTemplates();
      setStep('select');
      setImportResult(null);
      setSelectedTemplates([]);
    }
  }, [open]);

  const loadGlobalTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('device_templates')
        .select('*')
        .eq('is_global', true)
        .eq('active', true)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      setGlobalTemplates(data || []);
    } catch (error) {
      console.error('Error loading global templates:', error);
      toast.error('Failed to load global templates');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!currentTenant || selectedTemplates.length === 0) {
      toast.error('Please select templates to import');
      return;
    }

    try {
      setImporting(true);
      setStep('importing');

      const result = await importTemplatesWithDevices(selectedTemplates);
      setImportResult(result);
      setStep('results');
      
      if (result.conflicts.length === 0) {
        toast.success(`Successfully imported ${result.templates_imported} template(s) and ${result.devices_imported} device(s)`);
      } else {
        toast.success(`Imported ${result.templates_imported} template(s) and ${result.devices_imported} device(s) with ${result.conflicts.length} conflict(s)`);
      }
      
      onImportComplete();
    } catch (error) {
      console.error('Error importing templates:', error);
      toast.error('Failed to import templates');
      setStep('select');
    } finally {
      setImporting(false);
    }
  };

  const importTemplatesWithDevices = async (templateIds: string[]): Promise<ImportResult> => {
    const result: ImportResult = {
      templates_imported: 0,
      devices_imported: 0,
      devices_skipped: 0,
      conflicts: [],
      log_id: ''
    };

    // Get templates to import
    const { data: templates, error: templateError } = await supabase
      .from('device_templates')
      .select('*')
      .in('id', templateIds)
      .eq('is_global', true);

    if (templateError) throw templateError;
    if (!templates) return result;

    for (const template of templates) {
      // Import template
      const importedTemplate = await importTemplate(template);
      if (importedTemplate) {
        result.templates_imported++;

        // Get devices for this template
        const { data: globalDevices, error: devicesError } = await supabase
          .from('devices')
          .select('*')
          .eq('template_id', template.id)
          .eq('active', true)
          .is('tenant_id', null); // Global devices only

        if (devicesError) throw devicesError;

        // Import devices
        if (globalDevices) {
          for (const device of globalDevices) {
            const importResult = await importDevice(device, importedTemplate.id);
            if (importResult.success) {
              result.devices_imported++;
            } else {
              result.devices_skipped++;
              result.conflicts.push({
                device_id: device.id,
                device_name: device.name,
                conflict_reason: importResult.reason || 'Unknown conflict',
                existing_device_name: importResult.existing_device_name
              });
            }
          }
        }
      }
    }

    // Log the import
    const { data: logData, error: logError } = await supabase
      .from('template_import_logs')
      .insert({
        tenant_id: currentTenant!.id,
        template_id: templates[0].id, // Use first template as reference
        action_type: 'import',
        status: result.conflicts.length === 0 ? 'success' : 'partial',
        devices_imported: result.devices_imported,
        devices_skipped: result.devices_skipped,
        conflict_report: result.conflicts as any,
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
        notes: `Imported ${result.templates_imported} template(s) and ${result.devices_imported} device(s)`
      })
      .select()
      .single();

    if (logError) console.error('Error logging import:', logError);
    result.log_id = logData?.id || '';

    return result;
  };

  const importTemplate = async (globalTemplate: GlobalTemplate) => {
    try {
      // Check if template with same source already exists
      const { data: existing } = await supabase
        .from('device_templates')
        .select('id, name')
        .eq('tenant_id', currentTenant!.id)
        .eq('source_template_id', globalTemplate.id)
        .single();

      if (existing) {
        // Template already imported, return existing
        return existing;
      }

      // Check if template with same name already exists
      const { data: nameConflict } = await supabase
        .from('device_templates')
        .select('id')
        .eq('tenant_id', currentTenant!.id)
        .eq('name', globalTemplate.name)
        .single();

      const templateName = nameConflict ? `${globalTemplate.name} (Imported)` : globalTemplate.name;

      const { data, error } = await supabase
        .from('device_templates')
        .insert({
          name: templateName,
          category: globalTemplate.category,
          description: globalTemplate.description,
          properties_schema: globalTemplate.properties_schema,
          sku_formula: globalTemplate.sku_formula,
          description_formula: globalTemplate.description_formula,
          device_type_id: globalTemplate.device_type_id,
          is_global: false,
          tenant_id: currentTenant!.id,
          source_template_id: globalTemplate.id,
          import_status: 'imported',
          imported_at: new Date().toISOString(),
          sync_version: 1,
          active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error importing template:', error);
      return null;
    }
  };

  const importDevice = async (globalDevice: GlobalDevice, tenantTemplateId: string): Promise<{ success: boolean; reason?: string; existing_device_name?: string }> => {
    try {
      // Check for identity conflicts
      if (globalDevice.identity_hash) {
        const { data: existingDevice } = await supabase
          .from('devices')
          .select('name')
          .eq('tenant_id', currentTenant!.id)
          .eq('identity_hash', globalDevice.identity_hash)
          .single();

        if (existingDevice) {
          return {
            success: false,
            reason: 'Device with same identity (name, brand, model) already exists',
            existing_device_name: existingDevice.name
          };
        }
      }

      const { error } = await supabase
        .from('devices')
        .insert({
          name: globalDevice.name,
          category: globalDevice.category,
          brand: globalDevice.brand,
          model: globalDevice.model,
          unit_price: globalDevice.unit_price,
          template_id: tenantTemplateId,
          tenant_id: currentTenant!.id,
          source_device_id: globalDevice.id,
          import_status: 'imported',
          imported_at: new Date().toISOString(),
          sync_version: 1,
          is_global: false,
          active: true
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        reason: 'Database error during import'
      };
    }
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const filteredTemplates = globalTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClose = () => {
    setStep('select');
    setImportResult(null);
    setSelectedTemplates([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Global Templates</DialogTitle>
          <DialogDescription>
            Import global device templates and their associated devices into your tenant
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
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

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Importing templates will also import their associated devices. Any device conflicts will be reported and skipped.
                Brands and device types linked to templates will be added to your tenant management.
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.length === filteredTemplates.length && filteredTemplates.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTemplates(filteredTemplates.map(t => t.id));
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredTemplates.map((template) => (
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
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
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
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={selectedTemplates.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import {selectedTemplates.length} Template(s)
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin" />
            <h3 className="text-lg font-semibold">Importing Templates and Devices</h3>
            <p className="text-muted-foreground text-center">
              This may take a few moments depending on the number of devices being imported...
            </p>
          </div>
        )}

        {step === 'results' && importResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Templates Imported</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.templates_imported}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Devices Imported</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {importResult.devices_imported}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Devices Skipped</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {importResult.devices_skipped}
                  </div>
                </CardContent>
              </Card>
            </div>

            {importResult.conflicts.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                    Import Conflicts
                  </h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Device Name</TableHead>
                          <TableHead>Conflict Reason</TableHead>
                          <TableHead>Existing Device</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.conflicts.map((conflict, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {conflict.device_name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {conflict.conflict_reason}
                            </TableCell>
                            <TableCell>
                              {conflict.existing_device_name || 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-2">
              <Button onClick={handleClose}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}