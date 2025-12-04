import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Link2, Check, AlertCircle, Loader2 } from 'lucide-react';

interface DeviceSyncIndicatorProps {
  device: {
    id: string;
    source_device_id: string | null;
    sync_version: number | null;
    import_status: string | null;
  };
  globalSyncVersion?: number | null;
  onSyncComplete?: () => void;
  compact?: boolean;
}

export const DeviceSyncIndicator = ({ 
  device, 
  globalSyncVersion,
  onSyncComplete,
  compact = false 
}: DeviceSyncIndicatorProps) => {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  // Not an imported device
  if (!device.source_device_id) {
    return null;
  }

  const needsUpdate = globalSyncVersion !== null && 
    globalSyncVersion !== undefined && 
    device.sync_version !== globalSyncVersion;

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncing(true);

    try {
      // Fetch the latest global device data
      const { data: globalDevice, error: fetchError } = await supabase
        .from('devices')
        .select('*')
        .eq('id', device.source_device_id)
        .single();

      if (fetchError) throw fetchError;

      if (!globalDevice) {
        toast({
          title: 'Warning',
          description: 'Global device no longer exists',
          variant: 'destructive',
        });
        return;
      }

      // Update the tenant device with global device data
      const { error: updateError } = await supabase
        .from('devices')
        .update({
          name: globalDevice.name,
          category: globalDevice.category,
          brand: globalDevice.brand,
          model: globalDevice.model,
          unit_price: globalDevice.unit_price,
          cost_price: globalDevice.cost_price,
          msrp: globalDevice.msrp,
          currency_id: globalDevice.currency_id,
          cost_currency_id: globalDevice.cost_currency_id,
          msrp_currency_id: globalDevice.msrp_currency_id,
          specifications: globalDevice.specifications,
          template_properties: globalDevice.template_properties,
          image_url: globalDevice.image_url,
          sync_version: globalDevice.sync_version,
          last_synced_at: new Date().toISOString(),
          active: globalDevice.active,
        })
        .eq('id', device.id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Device synced with global catalog',
      });

      onSyncComplete?.();
    } catch (error) {
      console.error('Error syncing device:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync device',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center">
              {needsUpdate ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-amber-500 hover:text-amber-600"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <Link2 className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {needsUpdate ? 'Update available from global' : 'Linked to global device'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={needsUpdate ? 'default' : 'secondary'} className="gap-1">
        <Link2 className="h-3 w-3" />
        Imported
      </Badge>
      
      {needsUpdate && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              Update Available
            </>
          )}
        </Button>
      )}
      
      {!needsUpdate && device.import_status === 'imported' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Check className="h-4 w-4 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>Up to date with global</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
