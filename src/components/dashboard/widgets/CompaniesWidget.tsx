import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { WidgetConfig } from '../DashboardGrid';
import { useNavigate } from 'react-router-dom';

interface CompaniesWidgetProps {
  config: WidgetConfig;
  onUpdateConfig: (updates: Partial<WidgetConfig>) => void;
  customizeMode: boolean;
}

export function CompaniesWidget({ config, onUpdateConfig, customizeMode }: CompaniesWidgetProps) {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const filterType = config.filters?.type || 'all';

  useEffect(() => {
    if (currentTenant) {
      loadCompanies();
    }
  }, [currentTenant, filterType]);

  const loadCompanies = async () => {
    try {
      let query = supabase
        .from('companies')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true);

      if (filterType === 'leads') {
        query = query.eq('is_lead', true);
      } else if (filterType === 'customers') {
        query = query.eq('is_lead', false);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
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
      case 'leads': return 'Company Leads';
      case 'customers': return 'Customer Companies';
      default: return 'Companies';
    }
  };

  const getCount = () => {
    return companies.length;
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {getTitle()}
        </CardTitle>
        
        <div className="flex items-center gap-1">
          {(customizeMode || showFilters) && (
            <Select value={filterType} onValueChange={updateFilter}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="customers">Customers</SelectItem>
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
                onClick={() => navigate('/companies/add')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-2xl font-bold mb-2">{getCount()}</div>
        
        {!customizeMode && (
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : companies.length > 0 ? (
              <div className="space-y-1">
                {companies.slice(0, 3).map((company) => (
                  <div
                    key={company.id}
                    className="text-xs text-muted-foreground cursor-pointer hover:text-foreground truncate"
                    onClick={() => navigate('/companies')}
                  >
                    {company.name}
                  </div>
                ))}
                {companies.length > 3 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate('/companies')}
                  >
                    View all {companies.length} companies
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No companies found
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}