import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Brand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  active: boolean;
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching brands:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  return {
    brands,
    loading,
    error,
    refresh: fetchBrands
  };
}