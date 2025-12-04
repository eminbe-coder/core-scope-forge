import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/integrations/supabase/client';
import { 
  parseDeviceExcel, 
  validateDeviceImportData, 
  generateDeviceImportTemplate,
  DeviceImportRow 
} from '@/lib/device-import';
import { Upload, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeviceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  isGlobal?: boolean;
}

export function DeviceImportDialog({ open, onOpenChange, onImportComplete, isGlobal = false }: DeviceImportDialogProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importData, setImportData] = useState<DeviceImportRow[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    if (!isGlobal && !currentTenant) return;
    
    try {
      let query = supabase
        .from('device_templates')
        .select(`
          *,
          device_template_properties(*),
          properties_schema
        `)
        .eq('active', true);

      if (isGlobal) {
        query = query.eq('is_global', true);
      } else {
        query = query.or(`tenant_id.eq.${currentTenant!.id},is_global.eq.true`);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Get template properties for parsing context - handle both old and new format
      const templateProperties = (
        selectedTemplate?.device_template_properties?.map(prop => ({
          property_name: prop.property_name,
          property_type: prop.property_type
        })) || 
        selectedTemplate?.properties_schema?.map(prop => ({
          property_name: prop.name,
          property_type: prop.type
        })) || []
      );

      const result = await parseDeviceExcel(file, templateProperties);
      if (result.success && result.data) {
        setImportData(result.data);
        
        // Find the identifier property from the selected template - handle both formats
        const identifierProperty = (
          selectedTemplate?.device_template_properties?.find(prop => prop.is_identifier) ||
          selectedTemplate?.properties_schema?.find(prop => prop.is_identifier)
        );
        
        const validation = validateDeviceImportData(result.data, identifierProperty?.property_name || identifierProperty?.name);
        setValidationResult(validation);
      } else {
        toast({
          title: "Import Error",
          description: result.errors?.[0] || "Failed to parse Excel file",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "Failed to process the Excel file",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!importData.length || (!currentTenant && !isGlobal)) return;
    
    setImporting(true);
    
    try {
      // Get currencies for mapping
      const { data: currencies } = await supabase
        .from('currencies')
        .select('*')
        .eq('active', true);
      
      const currencyMap = new Map(currencies?.map(c => [c.code, c.id]) || []);
      
      // Process devices for insertion
      const devicesToInsert = importData.map(device => ({
        name: device.name,
        category: device.category,
        brand: device.brand || null,
        model: device.model || null,
        unit_price: device.unit_price || null,
        currency_id: device.currency_code ? currencyMap.get(device.currency_code) : currentTenant?.default_currency_id,
        specifications: device.specifications || null,
        image_url: device.image_url || null,
        template_id: selectedTemplate?.id || null,
        template_properties: selectedTemplate ? 
          Object.fromEntries(
            (selectedTemplate.device_template_properties || selectedTemplate.properties_schema || [])?.map((prop: any) => [
              prop.property_name || prop.name, 
              device[prop.property_name || prop.name] || device[prop.label_en] || null
            ]) || []
          ) : null,
        is_global: isGlobal,
        tenant_id: isGlobal ? null : currentTenant!.id,
      }));
      
      const { error } = await supabase
        .from('devices')
        .insert(devicesToInsert);
      
      if (error) throw error;
      
      toast({
        title: 'Import successful',
        description: `Imported ${devicesToInsert.length} devices`,
      });
      
      onImportComplete();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: 'Failed to import devices',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'No template selected',
        description: 'Please select a device template first',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Handle both old and new template property formats
      const templateProps = (selectedTemplate.device_template_properties || selectedTemplate.properties_schema || []).map((prop: any) => ({
        name: prop.property_name || prop.name,
        label_en: prop.label_en || prop.property_name || prop.name,
        type: prop.property_type || prop.type,
        required: prop.is_required || prop.required || false,
        is_identifier: prop.is_identifier || false
      }));

      const templateData = generateDeviceImportTemplate(
        templateProps,
        true // Include generation columns for dynamic SKU/Description support
      );
      
      const blob = new Blob([templateData as BlobPart], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `device-import-template-${selectedTemplate.name}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Template downloaded',
        description: 'Use this template to structure your device data',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Failed to generate template',
        variant: 'destructive',
      });
    }
  };

  const resetImport = () => {
    setImportData([]);
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (open) {
        fetchTemplates();
      } else {
        resetImport();
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {isGlobal ? 'Global ' : ''}Devices</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple {isGlobal ? 'global ' : ''}devices at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <Label>Device Template (Optional)</Label>
            <select
              className="w-full mt-1 p-2 border rounded-md"
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = templates.find(t => t.id === e.target.value);
                setSelectedTemplate(template || null);
                resetImport();
              }}
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.is_global ? '(Global)' : ''}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground mt-1">
              Select a template to include custom properties and generation settings in your import
            </p>
            {selectedTemplate && (
              <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <p className="font-medium">Template Features:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Custom properties: {(selectedTemplate.device_template_properties || selectedTemplate.properties_schema || []).length}</li>
                  <li>• Excel supports Dynamic SKU, Dynamic Description, Dynamic Short Description columns</li>
                  <li>• Use TRUE/FALSE in dynamic columns to control formula vs fixed text usage</li>
                  <li>• When dynamic=TRUE, provide formula in corresponding column (e.g., SKU column)</li>
                  <li>• When dynamic=FALSE, provide fixed text in corresponding column</li>
                </ul>
              </div>
            )}
          </div>

          {/* Template Download */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              disabled={!selectedTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <p className="text-sm text-muted-foreground">
              Download an Excel template with the correct format
            </p>
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="file-upload">Select Excel File</Label>
            <Input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="mt-1"
            />
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="space-y-2">
              {validationResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">Validation Errors:</div>
                    <ul className="list-disc list-inside mt-1">
                      {validationResult.errors.map((error: string, index: number) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">Warnings:</div>
                    <ul className="list-disc list-inside mt-1">
                      {validationResult.warnings.map((warning: string, index: number) => (
                        <li key={index} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.isValid && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Data validation passed! Ready to import {importData.length} devices.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Import Preview */}
          {importData.length > 0 && (
            <div>
              <Label>Import Preview</Label>
              <div className="mt-1 max-h-40 overflow-y-auto border rounded-md p-2">
                {importData.slice(0, 5).map((device, index) => (
                  <div key={index} className="flex items-center gap-2 py-1">
                    <Badge variant="outline">{device.name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {device.category} - {device.brand} {device.model}
                    </span>
                  </div>
                ))}
                {importData.length > 5 && (
                  <div className="text-sm text-muted-foreground mt-2">
                    ...and {importData.length - 5} more devices
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              importing || 
              !importData.length || 
              !validationResult?.isValid
            }
          >
            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Import {importData.length} Devices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}