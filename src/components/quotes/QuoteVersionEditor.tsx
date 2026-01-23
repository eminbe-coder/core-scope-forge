import { useState, useEffect } from 'react';
import { Plus, Trash2, Star, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useCurrency } from '@/hooks/use-currency';
import { toast } from 'sonner';
import { DeviceBrowserDialog } from '@/components/projects/DeviceBrowserDialog';

interface QuoteVersion {
  id: string;
  version_number: number;
  version_name: string;
  is_primary: boolean;
  total_amount: number;
  margin_percentage: number;
  notes: string | null;
}

interface QuoteItem {
  id: string;
  device_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  margin_percentage: number;
  total_cost: number;
  total_price: number;
  sort_order: number;
}

interface QuoteVersionEditorProps {
  quoteId: string;
  version: QuoteVersion;
  currencySymbol: string;
  onSetPrimary: () => void;
  onRefresh: () => void;
}

export function QuoteVersionEditor({
  quoteId,
  version,
  currencySymbol,
  onSetPrimary,
  onRefresh,
}: QuoteVersionEditorProps) {
  const { currentTenant } = useTenant();
  const { formatCurrency } = useCurrency();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeviceBrowser, setShowDeviceBrowser] = useState(false);

  const fetchItems = async () => {
    if (!version.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_version_id', version.id)
        .order('sort_order');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [version.id]);

  const handleAddDevices = async (devices: any[]) => {
    if (!currentTenant?.id) return;

    try {
      const newItems = devices.map((device, index) => ({
        tenant_id: currentTenant.id,
        quote_version_id: version.id,
        device_id: device.id,
        name: device.name,
        description: device.description || null,
        sku: device.sku || null,
        quantity: 1,
        unit_cost: device.cost_price || 0,
        unit_price: device.sell_price || 0,
        margin_percentage: device.cost_price
          ? ((device.sell_price - device.cost_price) / device.cost_price) * 100
          : 0,
        sort_order: items.length + index,
      }));

      const { error } = await supabase.from('quote_items').insert(newItems);

      if (error) throw error;

      toast.success(`Added ${devices.length} device(s)`);
      fetchItems();
      onRefresh();
    } catch (error) {
      console.error('Error adding devices:', error);
      toast.error('Failed to add devices');
    }
  };

  const handleAddManualItem = async () => {
    if (!currentTenant?.id) return;

    try {
      const { error } = await supabase.from('quote_items').insert({
        tenant_id: currentTenant.id,
        quote_version_id: version.id,
        name: 'New Item',
        quantity: 1,
        unit_cost: 0,
        unit_price: 0,
        sort_order: items.length,
      });

      if (error) throw error;

      fetchItems();
      onRefresh();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleUpdateItem = async (
    itemId: string,
    field: keyof QuoteItem,
    value: any
  ) => {
    try {
      const updateData: any = { [field]: value };

      // Recalculate margin if cost or price changes
      const item = items.find((i) => i.id === itemId);
      if (item) {
        if (field === 'unit_cost' || field === 'unit_price') {
          const cost = field === 'unit_cost' ? value : item.unit_cost;
          const price = field === 'unit_price' ? value : item.unit_price;
          if (cost > 0) {
            updateData.margin_percentage = ((price - cost) / cost) * 100;
          }
        }
      }

      const { error } = await supabase
        .from('quote_items')
        .update(updateData)
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setItems(
        items.map((i) =>
          i.id === itemId ? { ...i, ...updateData } : i
        )
      );
      onRefresh();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('quote_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItems(items.filter((i) => i.id !== itemId));
      onRefresh();
      toast.success('Item removed');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const totalMargin = totalCost > 0 ? ((totalPrice - totalCost) / totalCost) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Version Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!version.is_primary && (
            <Button variant="outline" size="sm" onClick={onSetPrimary}>
              <Star className="h-4 w-4 mr-2" />
              Set as Primary
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddManualItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Manual Item
          </Button>
          <Button size="sm" onClick={() => setShowDeviceBrowser(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add from Catalog
          </Button>
        </div>
      </div>

      {/* Items Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-4">No items in this version</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={handleAddManualItem}>
              Add Manual Item
            </Button>
            <Button onClick={() => setShowDeviceBrowser(true)}>
              Add from Catalog
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="w-24 text-center">Qty</TableHead>
                <TableHead className="w-32 text-right">Unit Cost</TableHead>
                <TableHead className="w-32 text-right">Unit Price</TableHead>
                <TableHead className="w-24 text-right">Margin</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'name', e.target.value)
                      }
                      className="border-0 p-0 h-auto font-medium"
                    />
                    {item.sku && (
                      <span className="text-xs text-muted-foreground">
                        {item.sku}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(
                          item.id,
                          'quantity',
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-20 text-center"
                      min={1}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-muted-foreground text-sm">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        value={item.unit_cost}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'unit_cost',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-24 text-right"
                        step="0.01"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-muted-foreground text-sm">
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) =>
                          handleUpdateItem(
                            item.id,
                            'unit_price',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-24 text-right"
                        step="0.01"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={item.margin_percentage >= 0 ? 'secondary' : 'destructive'}
                    >
                      {item.margin_percentage.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {currencySymbol}
                    {(item.quantity * item.unit_price).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={3} className="text-right">
                  Totals:
                </TableCell>
                <TableCell className="text-right">
                  {currencySymbol}
                  {totalCost.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {currencySymbol}
                  {totalPrice.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={totalMargin >= 0 ? 'secondary' : 'destructive'}>
                    {totalMargin.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-lg">
                  {currencySymbol}
                  {totalPrice.toLocaleString()}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <DeviceBrowserDialog
        isOpen={showDeviceBrowser}
        onClose={() => setShowDeviceBrowser(false)}
        onConfirm={(selectedDevices) => {
          handleAddDevices(selectedDevices.map(sd => ({
            id: sd.device_id,
            name: sd.device.name,
            description: null,
            sku: null,
            cost_price: sd.device.cost_price,
            sell_price: sd.unit_price,
          })));
          setShowDeviceBrowser(false);
        }}
      />
    </div>
  );
}
