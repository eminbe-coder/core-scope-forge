import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface CurrencyInfo {
  id: string;
  code: string;
  symbol: string;
  name?: string;
}

export function useCurrency() {
  const { currentTenant } = useTenant();
  const [currency, setCurrency] = useState<CurrencyInfo>({ id: 'USD', code: 'USD', symbol: '$' });

  useEffect(() => {
    const load = async () => {
      try {
        const id = currentTenant?.default_currency_id;
        if (!id) return; // keep default USD if tenant not loaded
        const { data } = await supabase
          .from('currencies')
          .select('id, code, symbol, name')
          .eq('id', id)
          .single();
        if (data) setCurrency({ id: data.id, code: data.code, symbol: data.symbol, name: data.name });
      } catch (e) {
        console.warn('useCurrency: failed to load currency, falling back to USD', e);
      }
    };
    load();
  }, [currentTenant?.default_currency_id]);

  const formatCurrency = useMemo(() => {
    return (amount: number, minimumFractionDigits = 0) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code || 'USD',
        minimumFractionDigits
      }).format(amount || 0);
  }, [currency.code]);

  return { currencyCode: currency.code, currencySymbol: currency.symbol, formatCurrency };
}
