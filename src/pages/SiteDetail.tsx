import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, FileText, CheckSquare, Building2, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';

interface Site {
  id: string;
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
  is_lead?: boolean;
  customers: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface Deal {
  id: string;
  name: string;
  value: number;
  status: string;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  created_at: string;
  notes?: string;
}

interface Company {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  notes?: string;
}

const SiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [site, setSite] = useState<Site | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant && id) {
      fetchSiteData();
    }
  }, [currentTenant, id]);

  const fetchSiteData = async () => {
    try {
      // Fetch site details
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select(`
          *,
          customers(id, name)
        `)
        .eq('id', id)
        .eq('tenant_id', currentTenant?.id)
        .single();

      if (siteError) throw siteError;
      setSite(siteData);

      // Fetch deals connected to this site
      const dealsQuery = await supabase
        .from('deals')
        .select('id, name, value, status, created_at')
        .eq('site_id', id)
        .eq('tenant_id', currentTenant?.id);

      if (dealsQuery.error) throw dealsQuery.error;
      setDeals(dealsQuery.data || []);

      // Fetch linked contacts with notes
      const { data: contactLinksData, error: contactLinksError } = await supabase
        .from('contact_sites')
        .select(`
          notes,
          contacts(id, first_name, last_name, email, created_at)
        `)
        .eq('site_id', id);

      if (contactLinksError) throw contactLinksError;
      
      const linkedContacts = contactLinksData?.map(link => ({
        id: (link.contacts as any)?.id,
        first_name: (link.contacts as any)?.first_name,
        last_name: (link.contacts as any)?.last_name,
        email: (link.contacts as any)?.email,
        created_at: (link.contacts as any)?.created_at,
        notes: link.notes,
      })).filter(contact => contact.id) || [];
      
      setContacts(linkedContacts);

      // Fetch linked companies with notes
      const { data: companyLinksData, error: companyLinksError } = await supabase
        .from('company_sites')
        .select(`
          notes,
          companies(id, name, email, created_at)
        `)
        .eq('site_id', id);

      if (companyLinksError) throw companyLinksError;
      
      const linkedCompanies = companyLinksData?.map(link => ({
        id: (link.companies as any)?.id,
        name: (link.companies as any)?.name,
        email: (link.companies as any)?.email,
        created_at: (link.companies as any)?.created_at,
        notes: link.notes,
      })).filter(company => company.id) || [];
      
      setCompanies(linkedCompanies);

    } catch (error: any) {
      console.error('Error fetching site data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load site details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading site details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!site) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-lg font-semibold">Site not found</p>
            <Button onClick={() => navigate('/sites')} className="mt-4">
              Back to Sites
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/sites')}
              className="h-8 w-8 p-0"
            >
              ←
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MapPin className="h-6 w-6" />
                {site.name}
              </h1>
              <p className="text-muted-foreground">{site.address}</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/sites/edit/${site.id}`)}>
            Edit Site
          </Button>
        </div>

        {/* Site Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{site.address}</p>
              </div>
              {(site.city || site.state || site.country) && (
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {[site.city, site.state, site.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {site.postal_code && (
                <div>
                  <p className="text-sm font-medium">Postal Code</p>
                  <p className="text-sm text-muted-foreground">{site.postal_code}</p>
                </div>
              )}
              {(site.latitude && site.longitude) && (
                <div>
                  <p className="text-sm font-medium">Coordinates</p>
                  <p className="text-sm text-muted-foreground">
                    {site.latitude}, {site.longitude}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Site Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {site.customers && (
                <div>
                  <p className="text-sm font-medium">Customer</p>
                  <button
                    className="text-sm text-primary hover:underline"
                    onClick={() => navigate(`/customers/${site.customers?.id}`)}
                  >
                    {site.customers.name}
                  </button>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">Type</p>
                <p className="text-sm text-muted-foreground">
                  {site.is_lead ? 'Lead Site' : 'Customer Site'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(site.created_at).toLocaleDateString()}
                </p>
              </div>
              {site.notes && (
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground">{site.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Deals, Contacts, and Companies Tabs */}
        <Tabs defaultValue="deals" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deals" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Deals ({deals.length})
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies ({companies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connected Deals</CardTitle>
              </CardHeader>
              <CardContent>
                {deals.length > 0 ? (
                  <div className="space-y-4">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => navigate(`/deals/edit/${deal.id}`)}
                      >
                        <div>
                          <h4 className="font-medium">{deal.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Deal
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${deal.value.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {deal.status.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No deals connected to this site yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connected Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                {contacts.length > 0 ? (
                  <div className="space-y-4">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => navigate(`/contacts`)}
                      >
                        <div>
                          <h4 className="font-medium">{contact.first_name} {contact.last_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {contact.email || 'No email'}
                          </p>
                          {contact.notes && (
                            <p className="text-xs text-muted-foreground font-medium mt-1">
                              {contact.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(contact.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No contacts connected to this site yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Linked Companies</CardTitle>
              </CardHeader>
              <CardContent>
                {companies.length > 0 ? (
                  <div className="space-y-4">
                    {companies.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => navigate(`/companies`)}
                      >
                        <div>
                          <h4 className="font-medium">{company.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {company.email || 'No email'}
                          </p>
                          {company.notes && (
                            <p className="text-xs text-muted-foreground font-medium mt-1">
                              {company.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(company.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No companies linked to this site yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SiteDetail;