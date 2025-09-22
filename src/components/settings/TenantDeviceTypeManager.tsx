import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';

interface DeviceType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
  is_global: boolean;
  parent_device_type_id?: string;
  tenant_id?: string;
  sub_types?: DeviceType[];
}

export function TenantDeviceTypeManager() {
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (currentTenant) {
      loadDeviceTypes();
    }
  }, [currentTenant]);

  const loadDeviceTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all device types (global and tenant-specific)
      const { data, error: fetchError } = await supabase
        .from('device_types')
        .select('*')
        .eq('active', true)
        .order('sort_order');

      if (fetchError) throw fetchError;

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
    } catch (error) {
      console.error('Error loading device types:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load device types: ${errorMessage}`);
      toast.error(`Failed to load device types: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const renderDeviceType = (deviceType: DeviceType, level = 0) => {
    return (
      <div key={deviceType.id} className="space-y-2">
        <div 
          className="flex items-center justify-between p-4 border rounded-lg"
          style={{ marginLeft: level * 20 }}
        >
          <div className="flex items-center gap-3">
            {level > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{deviceType.name}</h3>
                {deviceType.is_global && (
                  <Badge variant="secondary">Global</Badge>
                )}
                {!deviceType.is_global && deviceType.tenant_id === currentTenant?.id && (
                  <Badge variant="outline">Custom</Badge>
                )}
              </div>
              {deviceType.description && (
                <p className="text-sm text-muted-foreground">{deviceType.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {deviceType.is_global ? (
              <Badge variant="outline">Read-only</Badge>
            ) : (
              <>
                <Button size="sm" variant="ghost">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {deviceType.sub_types?.map(subType => renderDeviceType(subType, level + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Type Management</CardTitle>
          <CardDescription>Loading device types...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Type Management</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadDeviceTypes} variant="outline">
            Retry Loading
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Type Management</CardTitle>
        <CardDescription>
          Manage device types available to your organization. Global types are imported from device templates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deviceTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No device types available. Import device templates to get device type information.
            </div>
          ) : (
            <div className="space-y-4">
              {deviceTypes.map(deviceType => renderDeviceType(deviceType))}
            </div>
          )}
          
          <div className="pt-4 border-t">
            <Button disabled className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Device Type (Coming Soon)
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Custom device type creation will be available in a future update
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}