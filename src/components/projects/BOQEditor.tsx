import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Settings2, GripVertical } from 'lucide-react';
import { DeviceBrowserDialog, SelectedDevice } from './DeviceBrowserDialog';
import { BOQExport } from './BOQExport';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

interface ProjectDevice {
  id: string;
  device_id: string;
  quantity: number;
  unit_price: number | null;
  notes: string | null;
  devices: {
    id: string;
    name: string;
    category: string;
    brand: string | null;
    model: string | null;
    unit_price: number | null;
    cost_price: number | null;
    msrp: number | null;
    currencies: {
      symbol: string;
      code: string;
    } | null;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  deals: { name: string } | null;
  currencies: { symbol: string; code: string } | null;
}

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'item', label: '#', visible: true, width: 50, minWidth: 40 },
  { id: 'name', label: 'Name', visible: true, width: 200, minWidth: 120 },
  { id: 'brand', label: 'Brand', visible: true, width: 120, minWidth: 80 },
  { id: 'model', label: 'Model', visible: true, width: 120, minWidth: 80 },
  { id: 'category', label: 'Category', visible: true, width: 120, minWidth: 80 },
  { id: 'quantity', label: 'Qty', visible: true, width: 80, minWidth: 60 },
  { id: 'unit_price', label: 'Unit Price', visible: true, width: 100, minWidth: 80 },
  { id: 'total', label: 'Total', visible: true, width: 120, minWidth: 80 },
  { id: 'cost_price', label: 'Cost Price', visible: false, width: 100, minWidth: 80 },
  { id: 'msrp', label: 'MSRP', visible: false, width: 100, minWidth: 80 },
  { id: 'notes', label: 'Notes', visible: false, width: 150, minWidth: 100 },
];

interface BOQEditorProps {
  projectId: string;
  project: Project;
  onUpdate?: () => void;
}

export const BOQEditor = ({ projectId, project, onUpdate }: BOQEditorProps) => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [devices, setDevices] = useState<ProjectDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(`boq-columns-${projectId}`);
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });
  const [isDeviceBrowserOpen, setIsDeviceBrowserOpen] = useState(false);
  const [resizing, setResizing] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, [projectId]);

  useEffect(() => {
    localStorage.setItem(`boq-columns-${projectId}`, JSON.stringify(columns));
  }, [columns, projectId]);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('project_devices')
        .select(`
          id,
          device_id,
          quantity,
          unit_price,
          notes,
          devices (
            id,
            name,
            category,
            brand,
            model,
            unit_price,
            cost_price,
            msrp,
            currencies!devices_currency_id_fkey(symbol, code)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at');

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  const toggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleColumnResize = (columnId: string, delta: number) => {
    setColumns(prev => prev.map(col => {
      if (col.id === columnId) {
        const newWidth = Math.max(col.minWidth, col.width + delta);
        return { ...col, width: newWidth };
      }
      return col;
    }));
  };

  const updateDeviceQuantity = async (deviceId: string, quantity: number) => {
    try {
      const { error } = await supabase
        .from('project_devices')
        .update({ quantity: Math.max(1, quantity) })
        .eq('id', deviceId);

      if (error) throw error;
      setDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, quantity: Math.max(1, quantity) } : d
      ));
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({ title: 'Error', description: 'Failed to update quantity', variant: 'destructive' });
    }
  };

  const updateDevicePrice = async (deviceId: string, price: number) => {
    try {
      const { error } = await supabase
        .from('project_devices')
        .update({ unit_price: price })
        .eq('id', deviceId);

      if (error) throw error;
      setDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, unit_price: price } : d
      ));
    } catch (error) {
      console.error('Error updating price:', error);
      toast({ title: 'Error', description: 'Failed to update price', variant: 'destructive' });
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('project_devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      toast({ title: 'Success', description: 'Device removed' });
    } catch (error) {
      console.error('Error removing device:', error);
      toast({ title: 'Error', description: 'Failed to remove device', variant: 'destructive' });
    }
  };

  const handleAddDevices = async (selectedDevices: SelectedDevice[]) => {
    if (!currentTenant) return;

    try {
      const existingIds = new Set(devices.map(d => d.device_id));
      const newDevices = selectedDevices.filter(d => !existingIds.has(d.device_id));
      
      if (newDevices.length === 0) {
        toast({ title: 'Info', description: 'All selected devices already exist in BOQ' });
        return;
      }

      const { error } = await supabase
        .from('project_devices')
        .insert(newDevices.map(d => ({
          project_id: projectId,
          device_id: d.device_id,
          quantity: d.quantity,
          unit_price: d.unit_price,
        })));

      if (error) throw error;
      
      await fetchDevices();
      toast({ title: 'Success', description: `Added ${newDevices.length} device(s)` });
      onUpdate?.();
    } catch (error) {
      console.error('Error adding devices:', error);
      toast({ title: 'Error', description: 'Failed to add devices', variant: 'destructive' });
    }
  };

  const formatPrice = (price: number | null, symbol: string = '$') => {
    if (price === null) return '-';
    return `${symbol}${price.toLocaleString()}`;
  };

  const getCellValue = (device: ProjectDevice, columnId: string, index: number) => {
    const symbol = device.devices.currencies?.symbol || project.currencies?.symbol || '$';
    const effectivePrice = device.unit_price ?? device.devices.unit_price ?? 0;
    
    switch (columnId) {
      case 'item': return index + 1;
      case 'name': return device.devices.name;
      case 'brand': return device.devices.brand || '-';
      case 'model': return device.devices.model || '-';
      case 'category': return device.devices.category || '-';
      case 'quantity': return device.quantity;
      case 'unit_price': return formatPrice(effectivePrice, symbol);
      case 'total': return formatPrice(effectivePrice * device.quantity, symbol);
      case 'cost_price': return formatPrice(device.devices.cost_price, symbol);
      case 'msrp': return formatPrice(device.devices.msrp, symbol);
      case 'notes': return device.notes || '-';
      default: return '-';
    }
  };

  const totals = useMemo(() => {
    return {
      quantity: devices.reduce((sum, d) => sum + d.quantity, 0),
      total: devices.reduce((sum, d) => {
        const price = d.unit_price ?? d.devices.unit_price ?? 0;
        return sum + (price * d.quantity);
      }, 0),
    };
  }, [devices]);

  const totalWidth = useMemo(() => 
    visibleColumns.reduce((sum, col) => sum + col.width, 0) + 60, // +60 for actions column
    [visibleColumns]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Bill of Quantities</CardTitle>
        <div className="flex items-center gap-2">
          <BOQExport 
            project={project} 
            devices={devices} 
            columns={visibleColumns}
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Show/Hide Columns</p>
                {columns.map(col => (
                  <div key={col.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={col.id}
                      checked={col.visible}
                      onCheckedChange={() => toggleColumn(col.id)}
                    />
                    <label htmlFor={col.id} className="text-sm cursor-pointer">
                      {col.label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Button size="sm" onClick={() => setIsDeviceBrowserOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Devices
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">No devices added yet</p>
            <Button onClick={() => setIsDeviceBrowserOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Devices
            </Button>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div style={{ minWidth: totalWidth }}>
              {/* Header */}
              <div className="flex border-b bg-muted/50">
                {visibleColumns.map((col, idx) => (
                  <div
                    key={col.id}
                    className="relative flex items-center px-3 py-2 font-medium text-sm border-r last:border-r-0"
                    style={{ width: col.width, minWidth: col.minWidth }}
                  >
                    {col.label}
                    {idx < visibleColumns.length - 1 && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startWidth = col.width;
                          
                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const delta = moveEvent.clientX - startX;
                            handleColumnResize(col.id, delta - (col.width - startWidth));
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                    )}
                  </div>
                ))}
                <div className="w-[60px] px-3 py-2 font-medium text-sm">
                  Actions
                </div>
              </div>

              {/* Rows */}
              {devices.map((device, index) => (
                <div key={device.id} className="flex border-b hover:bg-muted/30 transition-colors">
                  {visibleColumns.map(col => (
                    <div
                      key={col.id}
                      className="flex items-center px-3 py-2 text-sm border-r last:border-r-0"
                      style={{ width: col.width, minWidth: col.minWidth }}
                    >
                      {col.id === 'quantity' ? (
                        <Input
                          type="number"
                          min="1"
                          value={device.quantity}
                          onChange={(e) => updateDeviceQuantity(device.id, parseInt(e.target.value) || 1)}
                          className="h-7 w-full"
                        />
                      ) : col.id === 'unit_price' ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={device.unit_price ?? device.devices.unit_price ?? 0}
                          onChange={(e) => updateDevicePrice(device.id, parseFloat(e.target.value) || 0)}
                          className="h-7 w-full"
                        />
                      ) : (
                        <span className="truncate">{getCellValue(device, col.id, index)}</span>
                      )}
                    </div>
                  ))}
                  <div className="w-[60px] flex items-center justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeDevice(device.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Totals Row */}
              <div className="flex border-t-2 bg-muted/50 font-semibold">
                {visibleColumns.map(col => (
                  <div
                    key={col.id}
                    className="flex items-center px-3 py-2 text-sm border-r last:border-r-0"
                    style={{ width: col.width, minWidth: col.minWidth }}
                  >
                    {col.id === 'name' && 'Total'}
                    {col.id === 'quantity' && totals.quantity}
                    {col.id === 'total' && formatPrice(totals.total, project.currencies?.symbol || '$')}
                  </div>
                ))}
                <div className="w-[60px]" />
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </CardContent>

      <DeviceBrowserDialog
        isOpen={isDeviceBrowserOpen}
        onClose={() => setIsDeviceBrowserOpen(false)}
        onConfirm={handleAddDevices}
      />
    </Card>
  );
};