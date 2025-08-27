import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Trash2, Plus } from 'lucide-react';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

interface CurrencySetting {
  id: string;
  from_currency_id: string;
  to_currency_id: string;
  conversion_rate: number;
  from_currency: Currency;
  to_currency: Currency;
}

export const CurrencySettings = () => {
  const { toast } = useToast();
  const { currentTenant, refreshTenants } = useTenant();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currencySettings, setCurrencySettings] = useState<CurrencySetting[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [newFromCurrency, setNewFromCurrency] = useState<string>('');
  const [newToCurrency, setNewToCurrency] = useState<string>('');
  const [newRate, setNewRate] = useState<string>('');

  useEffect(() => {
    if (currentTenant) {
      fetchCurrencies();
      fetchCurrencySettings();
      setDefaultCurrency(currentTenant.default_currency_id || '');
    }
  }, [currentTenant]);

  const fetchCurrencies = async () => {
    const { data, error } = await supabase
      .from('currencies')
      .select('*')
      .eq('active', true)
      .order('code');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch currencies',
        variant: 'destructive',
      });
      return;
    }

    setCurrencies(data || []);
  };

  const fetchCurrencySettings = async () => {
    if (!currentTenant) return;

    // Fetch currency settings and currencies separately
    const [settingsResult, currenciesResult] = await Promise.all([
      supabase
        .from('currency_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id),
      supabase
        .from('currencies')
        .select('*')
        .eq('active', true)
    ]);

    if (settingsResult.error || currenciesResult.error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch currency settings',
        variant: 'destructive',
      });
      return;
    }

    const settings = settingsResult.data || [];
    const allCurrencies = currenciesResult.data || [];

    // Map settings with currency details
    const mappedSettings = settings.map(setting => ({
      ...setting,
      from_currency: allCurrencies.find(c => c.id === setting.from_currency_id)!,
      to_currency: allCurrencies.find(c => c.id === setting.to_currency_id)!,
    }));

    setCurrencySettings(mappedSettings);
  };

  const updateDefaultCurrency = async (currencyId: string) => {
    if (!currentTenant) return;

    setLoading(true);
    const { error } = await supabase
      .from('tenants')
      .update({ default_currency_id: currencyId })
      .eq('id', currentTenant.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update default currency',
        variant: 'destructive',
      });
    } else {
      setDefaultCurrency(currencyId);
      // Refresh tenant data to update the context
      refreshTenants();
      toast({
        title: 'Success',
        description: 'Default currency updated successfully',
      });
    }
    setLoading(false);
  };

  const addConversionRate = async () => {
    if (!currentTenant || !newFromCurrency || !newToCurrency || !newRate) {
      toast({
        title: 'Error',
        description: 'Please fill all fields',
        variant: 'destructive',
      });
      return;
    }

    if (newFromCurrency === newToCurrency) {
      toast({
        title: 'Error',
        description: 'From and To currencies must be different',
        variant: 'destructive',
      });
      return;
    }

    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      toast({
        title: 'Error',
        description: 'Conversion rate must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('currency_settings')
      .upsert({
        tenant_id: currentTenant.id,
        from_currency_id: newFromCurrency,
        to_currency_id: newToCurrency,
        conversion_rate: rate,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add conversion rate',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Conversion rate added successfully',
      });
      setNewFromCurrency('');
      setNewToCurrency('');
      setNewRate('');
      fetchCurrencySettings();
    }
    setLoading(false);
  };

  const updateConversionRate = async (id: string, rate: number) => {
    setLoading(true);
    const { error } = await supabase
      .from('currency_settings')
      .update({ conversion_rate: rate })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update conversion rate',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Conversion rate updated successfully',
      });
      fetchCurrencySettings();
    }
    setLoading(false);
  };

  const deleteConversionRate = async (id: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('currency_settings')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversion rate',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Conversion rate deleted successfully',
      });
      fetchCurrencySettings();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Currency</CardTitle>
          <CardDescription>
            Set the default currency for your tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="default-currency">Default Currency</Label>
              <Select
                value={defaultCurrency}
                onValueChange={updateDefaultCurrency}
                disabled={loading}
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currency Conversion Rates</CardTitle>
          <CardDescription>
            Manage custom conversion rates between currencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label htmlFor="from-currency">From Currency</Label>
                <Select value={newFromCurrency} onValueChange={setNewFromCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
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
                <Select value={newToCurrency} onValueChange={setNewToCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
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
                <Label htmlFor="conversion-rate">Conversion Rate</Label>
                <Input
                  id="conversion-rate"
                  type="number"
                  step="0.000001"
                  placeholder="0.000000"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                />
              </div>
              <Button 
                onClick={addConversionRate} 
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Rate
              </Button>
            </div>

            {currencySettings.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From Currency</TableHead>
                    <TableHead>To Currency</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencySettings.map((setting) => (
                    <TableRow key={setting.id}>
                      <TableCell>
                        {setting.from_currency.code} - {setting.from_currency.name}
                      </TableCell>
                      <TableCell>
                        {setting.to_currency.code} - {setting.to_currency.name}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.000001"
                          defaultValue={setting.conversion_rate}
                          onBlur={(e) => {
                            const rate = parseFloat(e.target.value);
                            if (!isNaN(rate) && rate > 0 && rate !== setting.conversion_rate) {
                              updateConversionRate(setting.id, rate);
                            }
                          }}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteConversionRate(setting.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};