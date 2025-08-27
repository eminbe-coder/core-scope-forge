import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Handshake, Plus, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { WidgetConfig } from '../DashboardGrid';
import { useNavigate } from 'react-router-dom';

interface DealsWidgetProps {
  config: WidgetConfig;
  onUpdateConfig: (updates: Partial<WidgetConfig>) => void;
  customizeMode: boolean;
}

export function DealsWidget({ config, onUpdateConfig, customizeMode }: DealsWidgetProps) {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const filterType = config.filters?.type || 'open';

  useEffect(() => {
    if (currentTenant) {
      loadDeals();
    }
  }, [currentTenant, filterType]);

  const loadDeals = async () => {
    try {
      let query = supabase
        .from('deals')
        .select('*, customers(name)')
        .eq('tenant_id', currentTenant?.id);

      if (filterType === 'open') {
        query = query.in('status', ['lead', 'proposal', 'negotiation']);
      } else if (filterType === 'won') {
        query = query.eq('status', 'won');
      } else if (filterType === 'lost') {
        query = query.eq('status', 'lost');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (newFilterType: string) => {
    onUpdateConfig({
      filters: { ...config.filters, type: newFilterType }
    });
  };

  const getTitle = () => {
    switch (filterType) {
      case 'open': return 'Open Deals';
      case 'won': return 'Won Deals';
      case 'lost': return 'Lost Deals';
      default: return 'Deals';
    }
  };

  const getCount = () => {
    return deals.length;
  };

  const getTotalValue = () => {
    return deals.reduce((total, deal) => total + (deal.value || 0), 0);
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Handshake className="h-4 w-4" />
          {getTitle()}
        </CardTitle>
        
        <div className="flex items-center gap-1">
          {(customizeMode || showFilters) && (
            <Select value={filterType} onValueChange={updateFilter}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {!customizeMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigate('/deals')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-2xl font-bold mb-1">{getCount()}</div>
        <div className="text-xs text-muted-foreground mb-2">
          ${getTotalValue().toLocaleString()} total value
        </div>
        
        {!customizeMode && (
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : deals.length > 0 ? (
              <div className="space-y-1">
                {deals.slice(0, 3).map((deal) => (
                  <div
                    key={deal.id}
                    className="text-xs text-muted-foreground cursor-pointer hover:text-foreground truncate"
                    onClick={() => navigate('/deals')}
                  >
                    {deal.name} - ${deal.value?.toLocaleString() || 0}
                  </div>
                ))}
                {deals.length > 3 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate('/deals')}
                  >
                    View all {deals.length} deals
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No deals found
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}