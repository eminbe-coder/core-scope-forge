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
}

export function DeviceImportDialog({ open, onOpenChange, onImportComplete }: DeviceImportDialogProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importData, setImportData] = useState<DeviceImportRow[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = async () => {
    if (!currentTenant) return;
    
    try {
      const { data, error } = await supabase
        .from('device_templates')
        .select(`
          *,
          device_template_properties(*)
        `)
        .or(`tenant_id.eq.${currentTenant.id},is_global.eq.true`)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    
    try {
      const result = await parseDeviceExcel(file);
      
      if (result.success && result.data) {
        setImportData(result.data);
        
        // Find identifier property for validation
        const identifierProperty = selectedTemplate?.device_template_properties?.find(
          (prop: any) => prop.is_identifier
        )?.name;
        
        const validation = validateDeviceImportData(result.data, identifierProperty);
        setValidationResult(validation);
        
        toast({
          title: 'File parsed successfully',
          description: `Found ${result.validRows} valid rows out of ${result.totalRows} total rows`,
        });
      } else {
        toast({
          title: 'Import failed',
          description: result.errors?.join(', ') || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to parse Excel file',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!importData.length || !currentTenant) return;
    
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
        currency_id: device.currency_code ? currencyMap.get(device.currency_code) : currentTenant.default_currency_id,
        specifications: device.specifications || null,
        image_url: device.image_url || null,
        template_id: selectedTemplate?.id || null,
        template_properties: selectedTemplate ? 
          Object.fromEntries(
            selectedTemplate.device_template_properties?.map((prop: any) => [
              prop.name, 
              device[prop.name] || device[prop.label_en] || null
            ]) || []
          ) : null,
        tenant_id: currentTenant.id,
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
      const templateData = generateDeviceImportTemplate(
        selectedTemplate.device_template_properties || []
      );
      
      const blob = new Blob([templateData], { 
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
          <DialogTitle>Import Devices</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import multiple devices at once
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
              Select a template to include custom properties in your import
            </p>
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