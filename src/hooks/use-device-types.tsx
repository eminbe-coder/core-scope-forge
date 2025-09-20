import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DeviceType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
  is_global: boolean;
  parent_device_type_id?: string;
  sub_types?: DeviceType[];
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
      
      // Build hierarchical structure
      const typesMap = new Map<string, DeviceType>();
      const rootTypes: DeviceType[] = [];
      
      // First pass: create all types
      (data || []).forEach(type => {
        typesMap.set(type.id, { ...type, sub_types: [] });
      });
      
      // Second pass: build hierarchy
      typesMap.forEach(type => {
        if (type.parent_device_type_id) {
          const parent = typesMap.get(type.parent_device_type_id);
          if (parent) {
            parent.sub_types!.push(type);
          }
        } else {
          rootTypes.push(type);
        }
      });
      
      setDeviceTypes(rootTypes);
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