import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { Search, Package, Globe, Download, Loader2 } from 'lucide-react';

interface GlobalDevice {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  unit_price: number | null;
  cost_price: number | null;
  msrp: number | null;
  sync_version: number;
  currencies: {
    symbol: string;
    code: string;
  } | null;
}

interface GlobalDeviceImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const GlobalDeviceImportDialog = ({ 
  isOpen, 
  onClose, 
  onImportComplete 
}: GlobalDeviceImportDialogProps) => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [devices, setDevices] = useState<GlobalDevice[]>([]);
  const [existingImports, setExistingImports] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchGlobalDevices();
      fetchExistingImports();
      setSelectedDevices(new Set());
    }
  }, [isOpen, currentTenant]);

  const fetchGlobalDevices = async () => {
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
          sync_version,
          currencies!devices_currency_id_fkey(symbol, code)
        `)
        .eq('active', true)
        .eq('is_global', true)
        .is('tenant_id', null)
        .order('name');

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

  const fetchExistingImports = async () => {
    if (!currentTenant) return;
    
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('source_device_id')
        .eq('tenant_id', currentTenant.id)
        .not('source_device_id', 'is', null);

      if (error) throw error;
      const imported = new Set(data?.map(d => d.source_device_id).filter(Boolean) as string[]);
      setExistingImports(imported);
    } catch (error) {
      console.error('Error fetching existing imports:', error);
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

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [devices, searchTerm, selectedCategory, selectedBrand]);

  const toggleDevice = (deviceId: string) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedDevices(newSelected);
  };

  const toggleSelectAll = () => {
    const availableDevices = filteredDevices.filter(d => !existingImports.has(d.id));
    if (selectedDevices.size === availableDevices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(availableDevices.map(d => d.id)));
    }
  };

  const handleImport = async () => {
    if (!currentTenant || selectedDevices.size === 0) return;

    setImporting(true);
    try {
      const devicesToImport = devices.filter(d => selectedDevices.has(d.id));
      
      // Fetch full device data for selected devices
      const { data: fullDeviceData, error: fetchError } = await supabase
        .from('devices')
        .select('*')
        .in('id', Array.from(selectedDevices));

      if (fetchError) throw fetchError;

      // Create tenant copies with linking
      const importedDevices = fullDeviceData?.map(device => ({
        name: device.name,
        category: device.category,
        brand: device.brand,
        model: device.model,
        unit_price: device.unit_price,
        cost_price: device.cost_price,
        msrp: device.msrp,
        currency_id: device.currency_id,
        cost_currency_id: device.cost_currency_id,
        msrp_currency_id: device.msrp_currency_id,
        specifications: device.specifications,
        template_properties: device.template_properties,
        template_id: device.template_id,
        image_url: device.image_url,
        tenant_id: currentTenant.id,
        source_device_id: device.id,
        import_status: 'imported',
        imported_at: new Date().toISOString(),
        sync_version: device.sync_version || 1,
        is_global: false,
        active: true,
      }));

      const { error: insertError } = await supabase
        .from('devices')
        .insert(importedDevices || []);

      if (insertError) throw insertError;

      toast({
        title: 'Success',
        description: `Successfully imported ${selectedDevices.size} device(s)`,
      });

      onImportComplete();
      onClose();
    } catch (error) {
      console.error('Error importing devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to import devices',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const formatPrice = (price: number | null, currency: { symbol: string } | null) => {
    if (price === null) return 'N/A';
    return `${currency?.symbol || '$'}${price.toLocaleString()}`;
  };

  const availableCount = filteredDevices.filter(d => !existingImports.has(d.id)).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Import from Global Device Catalog
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
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
            <div className="flex gap-2 items-center justify-between">
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
              </div>

              {availableCount > 0 && (
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedDevices.size === availableCount ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
          </div>

          {/* Device Grid */}
          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-2 gap-3">
              {loading ? (
                <div className="col-span-2 flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <p className="text-muted-foreground">Loading global devices...</p>
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No global devices found</p>
                </div>
              ) : (
                filteredDevices.map(device => {
                  const isImported = existingImports.has(device.id);
                  const isSelected = selectedDevices.has(device.id);
                  
                  return (
                    <Card 
                      key={device.id}
                      className={`transition-all ${
                        isImported 
                          ? 'opacity-50 cursor-not-allowed' 
                          : isSelected 
                            ? 'ring-2 ring-primary bg-primary/5 cursor-pointer hover:shadow-md' 
                            : 'cursor-pointer hover:shadow-md'
                      }`}
                      onClick={() => !isImported && toggleDevice(device.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={isSelected}
                            disabled={isImported}
                            className="mt-1"
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => !isImported && toggleDevice(device.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{device.name}</p>
                              {isImported && (
                                <Badge variant="secondary" className="text-xs">
                                  Already Imported
                                </Badge>
                              )}
                            </div>
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
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="p-4 border-t bg-muted/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {filteredDevices.length} global device(s) • {existingImports.size} already imported
              </span>
              <span className="font-medium">
                {selectedDevices.size} selected for import
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={selectedDevices.size === 0 || importing}
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import {selectedDevices.size} Device(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
