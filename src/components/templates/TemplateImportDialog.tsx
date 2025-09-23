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
import { TemplateImportService, type TemplateImportResult, type ImportConflict } from '@/lib/template-import-service';

interface GlobalTemplate {
  id: string;
  name: string;
  label_ar?: string;
  category: string;
  description?: string;
  properties_schema?: any;
  sku_generation_type?: string;
  sku_formula?: string;
  description_generation_type?: string;
  description_formula?: string;
  short_description_generation_type?: string;
  short_description_formula?: string;
  description_ar_generation_type?: string;
  description_ar_formula?: string;
  short_description_ar_generation_type?: string;
  short_description_ar_formula?: string;
  device_type_id?: string;
  brand_id?: string;
  image_url?: string;
  supports_multilang?: boolean;
  template_version?: number;
  is_global: boolean;
  active: boolean;
  created_at: string;
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
  const [importResult, setImportResult] = useState<TemplateImportResult | null>(null);
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
      
      // First get all global templates
      const { data: globalTemplatesData, error: globalError } = await supabase
        .from('device_templates')
        .select('*')
        .eq('is_global', true)
        .eq('active', true)
        .is('deleted_at', null)
        .order('name');
      
      if (globalError) throw globalError;

      // Get already imported templates for current tenant
      const { data: importedTemplates, error: importedError } = await supabase
        .from('device_templates')
        .select('source_template_id')
        .eq('tenant_id', currentTenant?.id)
        .not('source_template_id', 'is', null);
      
      if (importedError) throw importedError;

      // Filter out already imported templates
      const importedTemplateIds = new Set(importedTemplates?.map(t => t.source_template_id) || []);
      const availableTemplates = globalTemplatesData?.filter(template => 
        !importedTemplateIds.has(template.id)
      ) || [];

      setGlobalTemplates(availableTemplates);
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use the new import service
      const importService = new TemplateImportService(currentTenant, user.id);
      const result = await importService.importTemplatesWithDevices(selectedTemplates);
      
      setImportResult(result);
      setStep('results');
      
      if (result.success) {
        if (result.conflicts.length === 0) {
          toast.success(`Successfully imported ${result.templates_imported} template(s) and ${result.devices_imported} device(s)`);
        } else {
          toast.success(`Imported ${result.templates_imported} template(s) and ${result.devices_imported} device(s) with ${result.conflicts.length} conflict(s)`);
        }
      } else {
        toast.error(`Import failed: ${result.errors.join(', ')}`);
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

  // Legacy import functions removed - now using TemplateImportService

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