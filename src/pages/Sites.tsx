import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Plus, Search, MapPin } from 'lucide-react';

interface Site {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  customer_id?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  active: boolean;
  customers: {
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

const Sites = () => {
  const { currentTenant } = useTenant();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSites = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('sites')
        .select(`
          *,
          customers(name)
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, [currentTenant]);

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.customers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading sites...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Sites</h1>
            <p className="text-muted-foreground">
              Manage physical locations and sites
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Site
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {filteredSites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sites found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Add physical locations and sites to track your projects and deals.
              </p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Site
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSites.map((site) => (
              <Card key={site.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">{site.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{site.address}</p>
                    {(site.city || site.state || site.country) && (
                      <p className="text-sm text-muted-foreground">
                        {[site.city, site.state, site.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {site.customers && (
                      <p className="text-sm text-muted-foreground">
                        Customer: {site.customers.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(site.created_at).toLocaleDateString()}
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

export default Sites;