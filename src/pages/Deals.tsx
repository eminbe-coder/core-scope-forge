import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Plus, Search, Handshake, DollarSign } from 'lucide-react';

interface Deal {
  id: string;
  tenant_id: string;
  customer_id?: string;
  site_id?: string;
  name: string;
  description?: string;
  value?: number;
  currency_id?: string;
  status: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability?: number;
  expected_close_date?: string;
  assigned_to?: string;
  notes?: string;
  customers: {
    name: string;
  } | null;
  sites: {
    name: string;
  } | null;
  currencies: {
    symbol: string;
  } | null;
  created_at: string;
  updated_at: string;
}

const statusColors = {
  lead: 'bg-gray-500',
  qualified: 'bg-blue-500',
  proposal: 'bg-yellow-500',
  negotiation: 'bg-orange-500',
  won: 'bg-green-500',
  lost: 'bg-red-500',
};

const Deals = () => {
  const { currentTenant } = useTenant();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDeals = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          customers(name),
          sites(name),
          currencies(symbol)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [currentTenant]);

  const filteredDeals = deals.filter(deal =>
    deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.customers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading deals...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Deals</h1>
            <p className="text-muted-foreground">
              Track and manage sales opportunities
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Deal
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {filteredDeals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Handshake className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deals found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Start tracking sales opportunities by creating your first deal.
              </p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Deal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDeals.map((deal) => (
              <Card key={deal.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Handshake className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg truncate">{deal.name}</CardTitle>
                    </div>
                    <Badge 
                      className={`text-white ${statusColors[deal.status]}`}
                      variant="secondary"
                    >
                      {deal.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {deal.value && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">
                          {deal.currencies?.symbol || '$'}{deal.value.toLocaleString()}
                        </span>
                        {deal.probability > 0 && (
                          <span className="text-sm text-muted-foreground">
                            ({deal.probability}%)
                          </span>
                        )}
                      </div>
                    )}
                    {deal.customers && (
                      <p className="text-sm text-muted-foreground">
                        Customer: {deal.customers.name}
                      </p>
                    )}
                    {deal.sites && (
                      <p className="text-sm text-muted-foreground">
                        Site: {deal.sites.name}
                      </p>
                    )}
                    {deal.expected_close_date && (
                      <p className="text-sm text-muted-foreground">
                        Expected close: {new Date(deal.expected_close_date).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(deal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Deals;