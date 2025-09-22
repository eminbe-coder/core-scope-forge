import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';
import { Loader2, Search, Settings, Zap, Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Device {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  unit_price?: number;
  currency?: {
    code: string;
    symbol: string;
  };
  template_properties?: any;
  specifications?: any;
  image_url?: string;
  is_global: boolean;
  template_id?: string;
  template?: {
    id: string;
    name: string;
    sku_formula?: string;
    description_formula?: string;
  };
}

interface DeviceTemplate {
  id: string;
  name: string;
  sku_formula?: string;
  description_formula?: string;
}

export default function BrowseDevices() {
  const { currentTenant } = useTenant();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [configuredProperties, setConfiguredProperties] = useState<Record<string, any>>({});
  const [generatedSku, setGeneratedSku] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');

  useEffect(() => {
    fetchDevices();
    fetchTemplates();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedDevice) {
      generateSkuAndDescription();
    }
  }, [selectedDevice, configuredProperties]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          currency:currencies!devices_currency_id_fkey(code, symbol),
          template:device_templates(id, name, sku_formula, description_formula)
        `)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setDevices((data || []).map(device => ({
        ...device,
        currency: device.currency || undefined,
        template: device.template || undefined
      })));
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('device_templates')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const generateSkuAndDescription = () => {
    if (!selectedDevice || !selectedDevice.template) return;

    // Simple formula engine - replace placeholders with configured values
    const replaceFormula = (formula: string) => {
      let result = formula || '';
      
      // Replace device properties
      result = result.replace(/\{device\.name\}/g, selectedDevice.name || '');
      result = result.replace(/\{device\.category\}/g, selectedDevice.category || '');
      result = result.replace(/\{device\.brand\}/g, selectedDevice.brand || '');
      result = result.replace(/\{device\.model\}/g, selectedDevice.model || '');
      
      // Replace configured properties
      Object.entries(configuredProperties).forEach(([key, value]) => {
        const pattern = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(pattern, String(value || ''));
      });
      
      return result;
    };

    setGeneratedSku(replaceFormula(selectedDevice.template.sku_formula || ''));
    setGeneratedDescription(replaceFormula(selectedDevice.template.description_formula || ''));
  };

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device);
    setConfiguredProperties(device.template_properties || {});
  };

  const handlePropertyChange = (key: string, value: any) => {
    setConfiguredProperties(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const categories = [...new Set(devices.map(d => d.category))];
  
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (device.brand && device.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || device.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price?: number, currency?: any) => {
    if (!price || !currency) return 'N/A';
    return `${currency.symbol}${price.toLocaleString()}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Browse Devices</h1>
            <p className="text-muted-foreground">
              Select devices and configure their properties to generate SKUs and descriptions
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Devices</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, category, or brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Available Devices</CardTitle>
                <CardDescription>
                  Select a device to configure its properties and generate SKU/description
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No devices found matching your criteria
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredDevices.map(device => (
                      <div
                        key={device.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedDevice?.id === device.id ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => handleDeviceSelect(device)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            {device.image_url && (
                              <img
                                src={device.image_url}
                                alt={device.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold">{device.name}</h3>
                                {device.is_global && <Badge variant="secondary">Global</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {device.category} {device.brand && `• ${device.brand}`} {device.model && `• ${device.model}`}
                              </p>
                              <div className="flex items-center space-x-4 text-sm">
                                {device.unit_price && (
                                  <span className="font-medium text-primary">
                                    {formatPrice(device.unit_price, device.currency)}
                                  </span>
                                )}
                                {device.template && (
                                  <span className="flex items-center text-muted-foreground">
                                    <Settings className="h-3 w-3 mr-1" />
                                    {device.template.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/devices/${device.id}`);
              }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Configuration Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Device Configuration</CardTitle>
                <CardDescription>
                  Configure properties and view generated results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedDevice ? (
                  <>
                    {/* Device Info */}
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-1">{selectedDevice.name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedDevice.category}</p>
                    </div>

                    <Separator />

                    {/* Properties Configuration */}
                    {selectedDevice.template_properties && Object.keys(selectedDevice.template_properties).length > 0 && (
                      <div className="space-y-3">
                        <h5 className="font-medium">Configure Properties</h5>
                        {Object.entries(selectedDevice.template_properties).map(([key, defaultValue]) => (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`prop-${key}`} className="text-sm">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Label>
                            <Input
                              id={`prop-${key}`}
                              value={configuredProperties[key] || defaultValue || ''}
                              onChange={(e) => handlePropertyChange(key, e.target.value)}
                              placeholder={`Enter ${key}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator />

                    {/* Generated Results */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <h5 className="font-medium">Generated Results</h5>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Generated SKU</Label>
                          <div className="mt-1 p-2 bg-muted/50 rounded border">
                            <code className="text-sm">{generatedSku || 'No SKU formula available'}</code>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Generated Description</Label>
                          <div className="mt-1 p-2 bg-muted/50 rounded border">
                            <p className="text-sm">{generatedDescription || 'No description formula available'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a device to configure its properties and generate SKU/description</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}