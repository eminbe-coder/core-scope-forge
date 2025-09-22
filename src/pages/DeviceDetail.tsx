import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';
import { Loader2, Edit2, Save, X, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Device {
  id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  unit_price?: number;
  cost_price?: number;
  msrp?: number;
  currency_id?: string;
  cost_currency_id?: string;
  msrp_currency_id?: string;
  specifications?: any;
  template_properties?: any;
  image_url?: string;
  active: boolean;
  is_global: boolean;
  tenant_id?: string;
}

interface Currency {
  id: string;
  code: string;
  symbol: string;
}

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { hasPermission } = usePermissions();
  const [device, setDevice] = useState<Device | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Device>>({});

  useEffect(() => {
    if (id) {
      fetchDevice();
      fetchCurrencies();
    }
  }, [id]);

  const fetchDevice = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          currency:currency_id(code, symbol),
          cost_currency:cost_currency_id(code, symbol),
          msrp_currency:msrp_currency_id(code, symbol)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      setDevice(data);
      setFormData(data);
    } catch (error: any) {
      console.error('Error fetching device:', error);
      toast.error('Failed to load device details');
      navigate('/devices');
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

  const handleSave = async () => {
    if (!device || !id) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('devices')
        .update({
          name: formData.name,
          category: formData.category,
          brand: formData.brand,
          model: formData.model,
          unit_price: formData.unit_price ? Number(formData.unit_price) : null,
          cost_price: formData.cost_price ? Number(formData.cost_price) : null,
          msrp: formData.msrp ? Number(formData.msrp) : null,
          currency_id: formData.currency_id,
          cost_currency_id: formData.cost_currency_id,
          msrp_currency_id: formData.msrp_currency_id,
          specifications: formData.specifications,
          template_properties: formData.template_properties,
          image_url: formData.image_url,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Device updated successfully');
      setIsEditing(false);
      fetchDevice(); // Refresh data
    } catch (error: any) {
      console.error('Error updating device:', error);
      toast.error('Failed to update device');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(device || {});
    setIsEditing(false);
  };

  const canEdit = () => {
    if (device?.is_global) {
      return hasPermission('super_admin.access');
    }
    return hasPermission('devices.edit');
  };

  const getCurrencyDisplay = (currencyData: any) => {
    if (!currencyData) return '';
    return `${currencyData.code} (${currencyData.symbol})`;
  };

  const formatPrice = (price?: number, currency?: any) => {
    if (!price || !currency) return 'N/A';
    return `${currency.symbol}${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!device) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Device not found</p>
          <Button onClick={() => navigate('/devices')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Devices
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(device.is_global ? '/global-devices' : '/devices')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{device.name}</h1>
              <p className="text-muted-foreground">{device.category}</p>
            </div>
            {device.is_global && <Badge variant="secondary">Global Device</Badge>}
          </div>
          <div className="flex space-x-2">
            {canEdit() && !isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {isEditing && (
              <>
                <Button onClick={handleCancel} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Device Information</CardTitle>
                <CardDescription>Basic device details and specifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Device Name</Label>
                        <Input
                          id="name"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={formData.category || ''}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand">Brand</Label>
                        <Input
                          id="brand"
                          value={formData.brand || ''}
                          onChange={(e) => setFormData({...formData, brand: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          value={formData.model || ''}
                          onChange={(e) => setFormData({...formData, model: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="image_url">Image URL</Label>
                      <Input
                        id="image_url"
                        value={formData.image_url || ''}
                        onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Device Name</Label>
                      <p className="mt-1">{device.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                      <p className="mt-1">{device.category}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Brand</Label>
                      <p className="mt-1">{device.brand || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Model</Label>
                      <p className="mt-1">{device.model || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing Information */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Device pricing and cost information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit_price">Unit Price</Label>
                      <Input
                        id="unit_price"
                        type="number"
                        step="0.01"
                        value={formData.unit_price || ''}
                        onChange={(e) => setFormData({...formData, unit_price: e.target.value ? Number(e.target.value) : undefined})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_price">Cost Price</Label>
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        value={formData.cost_price || ''}
                        onChange={(e) => setFormData({...formData, cost_price: e.target.value ? Number(e.target.value) : undefined})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="msrp">MSRP</Label>
                      <Input
                        id="msrp"
                        type="number"
                        step="0.01"
                        value={formData.msrp || ''}
                        onChange={(e) => setFormData({...formData, msrp: e.target.value ? Number(e.target.value) : undefined})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Unit Price</Label>
                      <p className="mt-1 text-lg font-semibold">
                        {formatPrice(device.unit_price, (device as any).currency)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cost Price</Label>
                      <p className="mt-1">
                        {formatPrice(device.cost_price, (device as any).cost_currency)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">MSRP</Label>
                      <p className="mt-1">
                        {formatPrice(device.msrp, (device as any).msrp_currency)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Device Image */}
            {device.image_url && (
              <Card>
                <CardHeader>
                  <CardTitle>Device Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <img 
                    src={device.image_url} 
                    alt={device.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </CardContent>
              </Card>
            )}

            {/* Properties */}
            {device.template_properties && Object.keys(device.template_properties).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Template Properties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(device.template_properties).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{key}:</span>
                        <span className="text-sm font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Specifications */}
            {device.specifications && Object.keys(device.specifications).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(device.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{key}:</span>
                        <span className="text-sm font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}