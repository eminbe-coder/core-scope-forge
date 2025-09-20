import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DeviceType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
  is_global: boolean;
}

export function useDeviceTypes() {
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeviceTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('device_types')
        .select('*')
        .eq('active', true)
        .order('sort_order');

      if (error) throw error;
      setDeviceTypes(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching device types:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch device types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceTypes();
  }, []);

  return {
    deviceTypes,
    loading,
    error,
    refresh: fetchDeviceTypes
  };
}