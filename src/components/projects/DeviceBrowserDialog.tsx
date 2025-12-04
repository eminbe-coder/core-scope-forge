import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Search, Plus, Minus, Check, Package, X } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  unit_price: number | null;
  cost_price: number | null;
  msrp: number | null;
  tenant_id: string | null;
  currencies: {
    symbol: string;
    code: string;
  } | null;
}

export interface SelectedDevice {
  device_id: string;
  device: Device;
  quantity: number;
  unit_price: number;
}

interface DeviceBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (devices: SelectedDevice[]) => void;
  initialDevices?: SelectedDevice[];
}

export const DeviceBrowserDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  initialDevices = [] 
}: DeviceBrowserDialogProps) => {
  const { currentTenant } = useTenant();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedDevices, setSelectedDevices] = useState<Map<string, SelectedDevice>>(new Map());

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
      // Initialize with existing devices
      const initial = new Map<string, SelectedDevice>();
      initialDevices.forEach(d => initial.set(d.device_id, d));
      setSelectedDevices(initial);
    }
  }, [isOpen, currentTenant]);

  const fetchDevices = async () => {
    if (!currentTenant) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          id,
          name,
          category,
          brand,
          model,
          unit_price,
          cost_price,
          msrp,
          tenant_id,
          currencies!devices_currency_id_fkey(symbol, code)
        `)
        .eq('active', true)
        .or(`tenant_id.eq.${currentTenant.id},tenant_id.is.null`)
        .order('name');

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = [...new Set(devices.map(d => d.category).filter(Boolean))];
    return cats.sort();
  }, [devices]);

  const brands = useMemo(() => {
    const b = [...new Set(devices.map(d => d.brand).filter(Boolean))] as string[];
    return b.sort();
  }, [devices]);

  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = !searchTerm || 
        device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.model?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || device.category === selectedCategory;
      const matchesBrand = selectedBrand === 'all' || device.brand === selectedBrand;
      const matchesSource = selectedSource === 'all' || 
        (selectedSource === 'global' && !device.tenant_id) ||
        (selectedSource === 'tenant' && device.tenant_id);

      return matchesSearch && matchesCategory && matchesBrand && matchesSource;
    });
  }, [devices, searchTerm, selectedCategory, selectedBrand, selectedSource]);

  const toggleDevice = (device: Device) => {
    const newSelected = new Map(selectedDevices);
    if (newSelected.has(device.id)) {
      newSelected.delete(device.id);
    } else {
      newSelected.set(device.id, {
        device_id: device.id,
        device,
        quantity: 1,
        unit_price: device.unit_price || 0
      });
    }
    setSelectedDevices(newSelected);
  };

  const updateQuantity = (deviceId: string, delta: number) => {
    const newSelected = new Map(selectedDevices);
    const item = newSelected.get(deviceId);
    if (item) {
      const newQty = Math.max(1, item.quantity + delta);
      newSelected.set(deviceId, { ...item, quantity: newQty });
      setSelectedDevices(newSelected);
    }
  };

  const setQuantity = (deviceId: string, quantity: number) => {
    const newSelected = new Map(selectedDevices);
    const item = newSelected.get(deviceId);
    if (item) {
      newSelected.set(deviceId, { ...item, quantity: Math.max(1, quantity) });
      setSelectedDevices(newSelected);
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedDevices.values()));
    onClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedSource('all');
    onClose();
  };

  const formatPrice = (price: number | null, currency: { symbol: string } | null) => {
    if (price === null) return 'N/A';
    return `${currency?.symbol || '$'}${price.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">Select Devices for BOQ</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Device List */}
          <div className="flex-1 flex flex-col border-r">
            {/* Filters */}
            <div className="p-4 border-b space-y-3 bg-muted/30">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search devices by name, brand, or model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Device Grid */}
            <ScrollArea className="flex-1">
              <div className="p-4 grid grid-cols-2 gap-3">
                {loading ? (
                  <div className="col-span-2 flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Loading devices...</p>
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No devices found</p>
                  </div>
                ) : (
                  filteredDevices.map(device => {
                    const isSelected = selectedDevices.has(device.id);
                    return (
                      <Card 
                        key={device.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                        }`}
                        onClick={() => toggleDevice(device)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{device.name}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {device.brand} {device.model && `- ${device.model}`}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {device.category}
                                </Badge>
                                <span className="text-sm font-semibold text-primary">
                                  {formatPrice(device.unit_price, device.currencies)}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                  <Check className="h-4 w-4 text-primary-foreground" />
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Selected Devices */}
          <div className="w-80 flex flex-col bg-muted/20">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Selected Devices</h3>
              <p className="text-sm text-muted-foreground">
                {selectedDevices.size} device{selectedDevices.size !== 1 ? 's' : ''} selected
              </p>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {selectedDevices.size === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Click devices to add them</p>
                  </div>
                ) : (
                  Array.from(selectedDevices.values()).map(item => (
                    <Card key={item.device_id} className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDevice(item.device);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm truncate pr-4">{item.device.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.device.brand} {item.device.model && `- ${item.device.model}`}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.device_id, -1);
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => setQuantity(item.device_id, parseInt(e.target.value) || 1)}
                              className="w-14 h-7 text-center text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(item.device_id, 1);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatPrice(item.unit_price * item.quantity, item.device.currencies)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Total */}
            {selectedDevices.size > 0 && (
              <div className="p-4 border-t bg-background">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span className="text-lg font-bold text-primary">
                    ${Array.from(selectedDevices.values())
                      .reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedDevices.size === 0}>
            Confirm Selection ({selectedDevices.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};