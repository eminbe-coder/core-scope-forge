import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface EntitySourceSelectProps {
  value?: {
    type?: 'company' | 'contact' | 'user';
    id?: string;
  };
  onValueChange: (value: { type: 'company' | 'contact' | 'user'; id: string } | null) => void;
  label?: string;
}

interface SourceEntity {
  id: string;
  name: string;
  type: 'company' | 'contact' | 'user';
}

export const EntitySourceSelect = ({ value, onValueChange, label = "Source Entity" }: EntitySourceSelectProps) => {
  const [entities, setEntities] = useState<SourceEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTenant } = useTenant();

  useEffect(() => {
    loadEntities();
  }, [currentTenant]);

  const loadEntities = async () => {
    if (!currentTenant) return;

    try {
      // Load companies
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      // Load contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      // Load users (profiles)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', 
          await supabase
            .from('user_tenant_memberships')
            .select('user_id')
            .eq('tenant_id', currentTenant.id)
            .eq('active', true)
            .then(res => res.data?.map(m => m.user_id) || [])
        );

      const allEntities: SourceEntity[] = [
        ...(companies || []).map(c => ({
          id: c.id,
          name: c.name,
          type: 'company' as const
        })),
        ...(contacts || []).map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name || ''}`.trim(),
          type: 'contact' as const
        })),
        ...(profiles || []).map(p => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name || ''}`.trim(),
          type: 'user' as const
        }))
      ];

      setEntities(allEntities);
    } catch (error) {
      console.error('Error loading source entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (selectedValue: string) => {
    if (!selectedValue) {
      onValueChange(null);
      return;
    }

    const [type, id] = selectedValue.split(':');
    if (type && id) {
      onValueChange({ type: type as 'company' | 'contact' | 'user', id });
    }
  };

  const currentValue = value?.type && value?.id ? `${value.type}:${value.id}` : '';

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select onValueChange={handleValueChange} value={currentValue}>
        <SelectTrigger>
          <SelectValue placeholder="Select source entity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">None</SelectItem>
          {entities.map((entity) => (
            <SelectItem key={`${entity.type}:${entity.id}`} value={`${entity.type}:${entity.id}`}>
              {entity.name} ({entity.type})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};