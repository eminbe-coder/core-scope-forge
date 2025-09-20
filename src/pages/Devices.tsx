import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Cpu, DollarSign, Upload } from 'lucide-react';
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
  device_template_properties: Array<{
    id: string;
    property_name: string;
    label_en: string;
    property_type: string;
    is_required: boolean;
    is_identifier?: boolean;
    property_options?: any;
  }>;
  device_template_options: Array<{
    id: string;
    code: string;
    label_en: string;
    cost_modifier?: number;
  }>;
}

const Devices = () => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    model: '',
    unit_price: '',
    currency_id: currentTenant?.default_currency_id || '',
    specifications: '',
    image_url: '',
  });

  const [templateProperties, setTemplateProperties] = useState<Record<string, any>>({});

  const fetchDevices = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          currencies!devices_currency_id_fkey(symbol),
          cost_currencies:currencies!devices_cost_currency_id_fkey(symbol),
          msrp_currencies:currencies!devices_msrp_currency_id_fkey(symbol)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch devices',
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
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('device_templates')
        .select(`
          id,
          name,
          device_template_properties (*),
          device_template_options (*)
        `)
        .or(`tenant_id.eq.${currentTenant.id},is_global.eq.true`)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setDeviceTemplates(data || []);
    } catch (error) {
      console.error('Error fetching device templates:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchCurrencies();
    fetchDeviceTemplates();
    
    // Update form currency when tenant changes
    if (currentTenant?.default_currency_id) {
      setFormData(prev => ({
        ...prev,
        currency_id: currentTenant.default_currency_id || ''
      }));
    }
  }, [currentTenant]);

  const handleCreate = async () => {
    if (!currentTenant || !formData.name || !formData.category) {
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
        tenant_id: currentTenant.id,
        template_id: selectedTemplateId || null,
        template_properties: Object.keys(templateProperties).length > 0 ? templateProperties : null,
      };

      const { error } = await supabase
        .from('devices')
        .insert([deviceData]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Device created successfully',
      });

      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        category: '',
        brand: '',
        model: '',
        unit_price: '',
        currency_id: currentTenant?.default_currency_id || '',
        specifications: '',
        image_url: '',
      });
      setTemplateProperties({});
      setSelectedTemplateId('');
      fetchDevices();
    } catch (error) {
      console.error('Error creating device:', error);
      toast({
        title: 'Error',
        description: 'Failed to create device',
        variant: 'destructive',
      });
    }
  };

  const selectedTemplate = deviceTemplates.find(t => t.id === selectedTemplateId);

  const handleTemplatePropertyChange = (name: string, value: any) => {
    setTemplateProperties(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading devices...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Devices</h1>
            <p className="text-muted-foreground">
              Manage your device catalog and pricing
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
                <DialogDescription>
                  Create a new device in your catalog
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
                {selectedTemplate && selectedTemplate.device_template_properties.length > 0 && (
                  <div className="border-t pt-4">
                    <Label className="text-base font-medium mb-4 block">Template Properties</Label>
                    <DeviceTemplateForm
                      templateProperties={selectedTemplate.device_template_properties}
                      values={templateProperties}
                      onChange={handleTemplatePropertyChange}
                    />
                  </div>
                )}

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

        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import Devices
          </Button>
        </div>

        {filteredDevices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No devices found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Add devices to your catalog to use in projects.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDevices.map((device) => (
              <Card key={device.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  {(device as any).image_url && (
                    <div className="mb-3">
                      <img 
                        src={(device as any).image_url} 
                        alt={device.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
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
      </div>

      <DeviceImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={fetchDevices}
      />
    </DashboardLayout>
  );
};

export default Devices;