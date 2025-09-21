import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/use-currency';
import { Plus, Search, Cpu, DollarSign, Download, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageUpload } from '@/components/ui/image-upload';
import { DeviceImportDialog } from '@/components/device-import/DeviceImportDialog';
import { DeviceTemplateForm } from '@/components/device-creation/DeviceTemplateForm';

interface Device {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  unit_price: number | null;
  specifications: any;
  active: boolean;
  created_at: string;
  currencies: {
    symbol: string;
  } | null;
  template_id: string | null;
}

interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
}

interface DeviceTemplate {
  id: string;
  name: string;
  category: string;
  device_template_properties: Array<{
    id: string;
    property_name: string;
    label_en: string;
    property_type: string;
    is_required: boolean;
    is_identifier?: boolean;
    property_options?: any;
  }>;
  properties_schema?: any;
}

const GlobalDevices = () => {
  const { toast } = useToast();
  const { currencySymbol } = useCurrency();
  const [devices, setDevices] = useState<Device[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [filterTemplate, setFilterTemplate] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    model: '',
    unit_price: '',
    currency_id: '',
    specifications: '',
    image_url: '',
  });

  const [templateProperties, setTemplateProperties] = useState<Record<string, any>>({});

  const fetchGlobalDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          currencies!devices_currency_id_fkey(symbol)
        `)
        .eq('is_global', true)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching global devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch global devices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('active', true)
        .order('code');

      if (error) throw error;
      setCurrencies(data || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const fetchDeviceTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('device_templates')
        .select(`
          id,
          name,
          category,
          properties_schema,
          device_template_properties (*),
          device_template_options (*)
        `)
        .eq('is_global', true)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setDeviceTemplates(data || []);
    } catch (error) {
      console.error('Error fetching device templates:', error);
    }
  };

  useEffect(() => {
    fetchGlobalDevices();
    fetchCurrencies();
    fetchDeviceTemplates();
  }, []);

  const handleExportDevices = async () => {
    if (selectedDevices.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select devices to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      const devicesData = devices.filter(d => selectedDevices.includes(d.id));
      
      // Create export data
      const exportData = {
        devices: devicesData,
        exported_at: new Date().toISOString(),
        count: devicesData.length
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `global-devices-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: `Exported ${selectedDevices.length} device(s) successfully`,
      });

      setIsExportDialogOpen(false);
      setSelectedDevices([]);
    } catch (error) {
      console.error('Error exporting devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to export devices',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.category) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const deviceData = {
        name: formData.name,
        category: formData.category,
        brand: formData.brand || null,
        model: formData.model || null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        currency_id: formData.currency_id || null,
        specifications: formData.specifications ? JSON.parse(formData.specifications) : null,
        image_url: formData.image_url || null,
        is_global: true,
        template_id: selectedTemplateId || null,
        template_properties: Object.keys(templateProperties).length > 0 ? templateProperties : null,
        tenant_id: null,
      };

      const { error } = await supabase
        .from('devices')
        .insert([deviceData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Global device created successfully',
      });

      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        category: '',
        brand: '',
        model: '',
        unit_price: '',
        currency_id: '',
        specifications: '',
        image_url: '',
      });
      setTemplateProperties({});
      setSelectedTemplateId('');
      fetchGlobalDevices();
    } catch (error) {
      console.error('Error creating device:', error);
      toast({
        title: 'Error',
        description: 'Failed to create device',
        variant: 'destructive',
      });
    }
  };

  const handleTemplatePropertyChange = (name: string, value: any) => {
    setTemplateProperties(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const getUniqueValues = (field: keyof Device) => {
    const values = devices.map(device => device[field]).filter(Boolean);
    return [...new Set(values)] as string[];
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTemplate = filterTemplate === 'all' || device.template_id === filterTemplate;
    const matchesBrand = filterBrand === 'all' || device.brand === filterBrand;
    
    return matchesSearch && matchesTemplate && matchesBrand;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading global devices...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Global Devices</h1>
            <p className="text-muted-foreground">
              Global device catalog available to all tenants
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import from Excel
            </Button>
            <Button onClick={() => setIsExportDialogOpen(true)} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Devices
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Global Device</DialogTitle>
                  <DialogDescription>
                    Create a new device in the global catalog
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Template Selection */}
                  <div>
                    <Label htmlFor="template">Device Template (Optional)</Label>
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template to use predefined properties" />
                      </SelectTrigger>
                      <SelectContent>
                        {deviceTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Basic Device Information */}
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Device name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., LED Light, Sensor, Switch"
                    />
                  </div>
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Device brand"
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Model number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="unit_price">Unit Price</Label>
                      <Input
                        id="unit_price"
                        type="number"
                        step="0.01"
                        value={formData.unit_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={formData.currency_id} onValueChange={(value) => setFormData(prev => ({ ...prev, currency_id: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.id}>
                              {currency.code} ({currency.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <ImageUpload
                    value={formData.image_url}
                    onChange={(url) => setFormData(prev => ({ ...prev, image_url: url || '' }))}
                    bucket="device-images"
                    folder="devices"
                    maxSize={5}
                  />

                  {/* Template Properties */}
                  {(() => {
                    const selectedTemplate = deviceTemplates.find(t => t.id === selectedTemplateId);
                    let templateProps = selectedTemplate?.device_template_properties || [];
                    
                    // Handle properties_schema format if device_template_properties is empty
                    if (templateProps.length === 0 && selectedTemplate?.properties_schema) {
                      const schema = Array.isArray(selectedTemplate.properties_schema) 
                        ? selectedTemplate.properties_schema 
                        : [];
                      templateProps = schema.map((prop: any) => ({
                        id: prop.name || prop.id,
                        property_name: prop.name || prop.property_name,
                        label_en: prop.label_en || prop.name,
                        property_type: prop.type || prop.property_type,
                        is_required: prop.required || prop.is_required || false,
                        is_identifier: prop.is_identifier || false,
                        property_options: prop.property_options
                      }));
                    }
                    
                    if (templateProps.length > 0) {
                      return (
                        <div className="border-t pt-4">
                          <Label className="text-base font-medium mb-4 block">Template Properties</Label>
                          <DeviceTemplateForm
                            templateProperties={templateProps}
                            values={templateProperties}
                            onChange={handleTemplatePropertyChange}
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div>
                    <Label htmlFor="specifications">Additional Specifications (JSON)</Label>
                    <Textarea
                      id="specifications"
                      value={formData.specifications}
                      onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                      placeholder='{"power": "10W", "voltage": "24V"}'
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate}>Create Device</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterTemplate} onValueChange={setFilterTemplate}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              {deviceTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterBrand} onValueChange={setFilterBrand}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {getUniqueValues('brand').map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredDevices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No global devices found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                No devices match your current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDevices.map((device) => (
              <Card key={device.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                  </div>
                  <Badge variant="outline">{device.category}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {device.brand && (
                      <p className="text-sm">
                        <span className="font-medium">Brand:</span> {device.brand}
                      </p>
                    )}
                    {device.model && (
                      <p className="text-sm">
                        <span className="font-medium">Model:</span> {device.model}
                      </p>
                    )}
                    {device.unit_price && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {device.currencies?.symbol}{device.unit_price}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(device.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Export Global Devices</DialogTitle>
              <DialogDescription>
                Select devices to export for tenant import
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedDevices.length === filteredDevices.length && filteredDevices.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDevices(filteredDevices.map(d => d.id));
                            } else {
                              setSelectedDevices([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDevices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedDevices.includes(device.id)}
                            onChange={() => toggleDeviceSelection(device.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{device.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{device.category}</Badge>
                        </TableCell>
                        <TableCell>{device.brand || 'N/A'}</TableCell>
                        <TableCell>
                          {device.unit_price ? `${device.currencies?.symbol}${device.unit_price}` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedDevices.length} device(s) selected
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleExportDevices}
                    disabled={selectedDevices.length === 0}
                  >
                    Export {selectedDevices.length} Device(s)
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Global Device Import Dialog */}
        <DeviceImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onImportComplete={fetchGlobalDevices}
          isGlobal={true}
        />
      </div>
    </DashboardLayout>
  );
};

export default GlobalDevices;