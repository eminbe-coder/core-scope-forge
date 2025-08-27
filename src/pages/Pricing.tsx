import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { DollarSign, Save, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  active: boolean;
}

interface TenantPricingSettings {
  id?: string;
  tenant_id: string;
  default_currency_id: string | null;
  custom_conversion_rates: any;
  pricing_tiers: any;
}

interface ConversionRate {
  id: string;
  from_currency_id: string;
  to_currency_id: string;
  conversion_rate: number;
  updated_at: string;
  from_currency?: Currency;
  to_currency?: Currency;
}

const Pricing = () => {
  const { currentTenant, isAdmin } = useTenant();
  const { toast } = useToast();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [pricingSettings, setPricingSettings] = useState<TenantPricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conversionRates, setConversionRates] = useState<ConversionRate[]>([]);
  const [newRate, setNewRate] = useState({
    from_currency_id: '',
    to_currency_id: '',
    rate: 1
  });

  useEffect(() => {
    if (currentTenant && isAdmin) {
      fetchPricingData();
    }
  }, [currentTenant, isAdmin]);

  const fetchPricingData = async () => {
    if (!currentTenant) return;
    
    try {
      setLoading(true);
      
      // Fetch currencies
      const { data: currenciesData, error: currenciesError } = await supabase
        .from('currencies')
        .select('*')
        .eq('active', true)
        .order('code');
      
      if (currenciesError) throw currenciesError;
      
      // Fetch tenant pricing settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('tenant_pricing_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .single();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }
      
      // Fetch custom conversion rates
      const { data: ratesData, error: ratesError } = await supabase
        .from('currency_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id);
      
      if (ratesError) throw ratesError;
      
      setCurrencies(currenciesData || []);
      setPricingSettings(settingsData || {
        tenant_id: currentTenant.id,
        default_currency_id: null,
        custom_conversion_rates: {},
        pricing_tiers: {}
      });
      setConversionRates(ratesData || []);
    } catch (error) {
      console.error('Error fetching pricing data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pricing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePricingSettings = async () => {
    if (!currentTenant || !pricingSettings) return;
    
    try {
      setSaving(true);
      
      if (pricingSettings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('tenant_pricing_settings')
          .update({
            default_currency_id: pricingSettings.default_currency_id,
            custom_conversion_rates: pricingSettings.custom_conversion_rates,
            pricing_tiers: pricingSettings.pricing_tiers
          })
          .eq('id', pricingSettings.id);
        
        if (error) throw error;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('tenant_pricing_settings')
          .insert({
            tenant_id: currentTenant.id,
            default_currency_id: pricingSettings.default_currency_id,
            custom_conversion_rates: pricingSettings.custom_conversion_rates,
            pricing_tiers: pricingSettings.pricing_tiers
          })
          .select()
          .single();
        
        if (error) throw error;
        setPricingSettings(data);
      }
      
      toast({
        title: "Success",
        description: "Pricing settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving pricing settings:', error);
      toast({
        title: "Error",
        description: "Failed to save pricing settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addConversionRate = async () => {
    if (!currentTenant || !newRate.from_currency_id || !newRate.to_currency_id || !newRate.rate) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('currency_settings')
        .insert({
          tenant_id: currentTenant.id,
          from_currency_id: newRate.from_currency_id,
          to_currency_id: newRate.to_currency_id,
          conversion_rate: newRate.rate
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Conversion rate added successfully",
      });
      
      setNewRate({ from_currency_id: '', to_currency_id: '', rate: 1 });
      fetchPricingData();
    } catch (error) {
      console.error('Error adding conversion rate:', error);
      toast({
        title: "Error",
        description: "Failed to add conversion rate",
        variant: "destructive",
      });
    }
  };

  const deleteConversionRate = async (rateId: string) => {
    try {
      const { error } = await supabase
        .from('currency_settings')
        .delete()
        .eq('id', rateId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Conversion rate deleted successfully",
      });
      
      fetchPricingData();
    } catch (error) {
      console.error('Error deleting conversion rate:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversion rate",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">Access Denied</CardTitle>
              <CardDescription className="text-center">
                You need admin privileges to access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Pricing Settings</h1>
          <p className="text-muted-foreground">
            Manage currency and pricing configuration for {currentTenant?.name}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Default Currency Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Default Currency
              </CardTitle>
              <CardDescription>
                Set the default currency for your tenant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <>
                  <div>
                    <Label htmlFor="default-currency">Default Currency</Label>
                    <Select
                      value={pricingSettings?.default_currency_id || ''}
                      onValueChange={(value) => 
                        setPricingSettings(prev => prev ? { ...prev, default_currency_id: value } : null)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select default currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.code} - {currency.name} ({currency.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={savePricingSettings} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Add New Conversion Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Add Conversion Rate</CardTitle>
              <CardDescription>
                Set custom exchange rates between currencies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="from-currency">From Currency</Label>
                <Select
                  value={newRate.from_currency_id}
                  onValueChange={(value) => setNewRate(prev => ({ ...prev, from_currency_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select from currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="to-currency">To Currency</Label>
                <Select
                  value={newRate.to_currency_id}
                  onValueChange={(value) => setNewRate(prev => ({ ...prev, to_currency_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select to currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="rate">Exchange Rate</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.0001"
                  value={newRate.rate}
                  onChange={(e) => setNewRate(prev => ({ ...prev, rate: parseFloat(e.target.value) || 1 }))}
                  placeholder="1.0000"
                />
              </div>
              
              <Button onClick={addConversionRate} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Rates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Conversion Rates</CardTitle>
            <CardDescription>
              Manage your custom currency exchange rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : conversionRates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No conversion rates set up yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    conversionRates.map((rate) => (
                      <TableRow key={rate.from_currency_id + rate.to_currency_id}>
                        <TableCell>
                          <Badge variant="outline">
                            {currencies.find(c => c.id === rate.from_currency_id)?.code || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {currencies.find(c => c.id === rate.to_currency_id)?.code || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {rate.conversion_rate.toFixed(4)}
                        </TableCell>
                        <TableCell>
                          {new Date(rate.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteConversionRate(rate.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Pricing;