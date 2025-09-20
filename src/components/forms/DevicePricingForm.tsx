import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { useCurrency } from "@/hooks/use-currency";

interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
}

interface DevicePricingFormProps {
  deviceId?: string;
  templateProperties?: Array<{ name: string; value: any }>;
  onPricingCalculated?: (pricing: { costPrice: number; msrp: number }) => void;
}

export function DevicePricingForm({ deviceId, templateProperties = [], onPricingCalculated }: DevicePricingFormProps) {
  const { currentTenant } = useTenant();
  const { formatCurrency } = useCurrency();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [pricing, setPricing] = useState({
    costPrice: 0,
    costCurrencyId: '',
    msrp: 0,
    msrpCurrencyId: '',
    pricingType: 'manual' as 'manual' | 'formula',
    pricingFormula: ''
  });
  const [calculatedMsrp, setCalculatedMsrp] = useState<number | null>(null);
  const [formulaError, setFormulaError] = useState<string>('');

  useEffect(() => {
    fetchCurrencies();
    if (deviceId) {
      loadDevicePricing();
    }
  }, [deviceId, currentTenant]);

  const fetchCurrencies = async () => {
    try {
      const { data } = await supabase
        .from('currencies')
        .select('id, code, symbol, name')
        .eq('active', true)
        .order('name');
      
      setCurrencies(data || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const loadDevicePricing = async () => {
    if (!deviceId) return;

    try {
      const { data } = await supabase
        .from('devices')
        .select('cost_price, cost_currency_id, msrp, msrp_currency_id, pricing_type, pricing_formula')
        .eq('id', deviceId)
        .single();

      if (data) {
        setPricing({
          costPrice: data.cost_price || 0,
          costCurrencyId: data.cost_currency_id || '',
          msrp: data.msrp || 0,
          msrpCurrencyId: data.msrp_currency_id || '',
          pricingType: (data.pricing_type as 'manual' | 'formula') || 'manual',
          pricingFormula: data.pricing_formula || ''
        });
      }
    } catch (error) {
      console.error('Error loading device pricing:', error);
    }
  };

  const evaluateFormula = () => {
    if (!pricing.pricingFormula || pricing.pricingType !== 'formula') {
      setCalculatedMsrp(null);
      setFormulaError('');
      return;
    }

    try {
      let formula = pricing.pricingFormula;
      
      // Replace cost_price variable
      formula = formula.replace(/cost_price/g, pricing.costPrice.toString());
      
      // Replace template properties
      templateProperties.forEach(prop => {
        const regex = new RegExp(`${prop.name}`, 'g');
        formula = formula.replace(regex, prop.value?.toString() || '0');
      });

      // Basic validation - only allow numbers, operators, and parentheses
      if (!/^[0-9+\-*/.() ]+$/.test(formula)) {
        throw new Error('Invalid formula characters');
      }

      // Evaluate the formula (using Function constructor for safety)
      const result = Function(`"use strict"; return (${formula})`)();
      
      if (isNaN(result) || !isFinite(result)) {
        throw new Error('Formula result is not a valid number');
      }

      setCalculatedMsrp(Number(result.toFixed(2)));
      setFormulaError('');
      
      // Auto-update MSRP if formula is valid
      setPricing(prev => ({ ...prev, msrp: Number(result.toFixed(2)) }));
      
    } catch (error) {
      setFormulaError('Invalid formula');
      setCalculatedMsrp(null);
    }
  };

  useEffect(() => {
    evaluateFormula();
  }, [pricing.pricingFormula, pricing.costPrice, templateProperties]);

  useEffect(() => {
    if (onPricingCalculated) {
      onPricingCalculated({
        costPrice: pricing.costPrice,
        msrp: pricing.msrp
      });
    }
  }, [pricing.costPrice, pricing.msrp, onPricingCalculated]);

  const savePricing = async () => {
    if (!deviceId) return;

    try {
      const { error } = await supabase
        .from('devices')
        .update({
          cost_price: pricing.costPrice,
          cost_currency_id: pricing.costCurrencyId || null,
          msrp: pricing.msrp,
          msrp_currency_id: pricing.msrpCurrencyId || null,
          pricing_type: pricing.pricingType,
          pricing_formula: pricing.pricingFormula || null
        })
        .eq('id', deviceId);

      if (error) throw error;
      
      // Success feedback would go here
    } catch (error) {
      console.error('Error saving pricing:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Price
          </CardTitle>
          <CardDescription>Set the cost price for this device</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cost Price</Label>
              <Input
                type="number"
                step="0.01"
                value={pricing.costPrice}
                onChange={(e) => setPricing(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={pricing.costCurrencyId} onValueChange={(value) => setPricing(prev => ({ ...prev, costCurrencyId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.code} - {currency.name}
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
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            MSRP (Manufacturer's Suggested Retail Price)
          </CardTitle>
          <CardDescription>Set or calculate the MSRP for this device</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Pricing Method</Label>
            <RadioGroup 
              value={pricing.pricingType} 
              onValueChange={(value) => setPricing(prev => ({ ...prev, pricingType: value as 'manual' | 'formula' }))}
              className="flex gap-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">Manual Entry</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="formula" id="formula" />
                <Label htmlFor="formula">Formula Calculation</Label>
              </div>
            </RadioGroup>
          </div>

          {pricing.pricingType === 'formula' && (
            <div>
              <Label>Pricing Formula</Label>
              <Textarea
                value={pricing.pricingFormula}
                onChange={(e) => setPricing(prev => ({ ...prev, pricingFormula: e.target.value }))}
                placeholder="cost_price * 1.25 + 50"
                rows={2}
              />
              <div className="text-sm text-muted-foreground mt-1">
                Available variables: cost_price, {templateProperties.map(p => p.name).join(', ')}
              </div>
              {formulaError && (
                <div className="text-sm text-red-500 mt-1">{formulaError}</div>
              )}
              {calculatedMsrp !== null && !formulaError && (
                <div className="text-sm text-green-600 mt-1">
                  Calculated MSRP: {formatCurrency(calculatedMsrp)}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>MSRP</Label>
              <Input
                type="number"
                step="0.01"
                value={pricing.msrp}
                onChange={(e) => setPricing(prev => ({ ...prev, msrp: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                disabled={pricing.pricingType === 'formula' && calculatedMsrp !== null}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={pricing.msrpCurrencyId} onValueChange={(value) => setPricing(prev => ({ ...prev, msrpCurrencyId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {deviceId && (
            <Button onClick={savePricing} className="w-full">
              Save Pricing
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}