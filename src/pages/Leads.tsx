import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Target, Search, Building2, User, MapPin, Mail, Phone, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Lead {
  id: string;
  name: string;
  type: 'contact' | 'company' | 'site';
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  created_at: string;
  customer_name?: string;
  position?: string;
  industry?: string;
  first_name?: string;
  last_name?: string;
}

const Leads = () => {
  const { currentTenant } = useTenant();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchLeads = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const allLeads: Lead[] = [];

      // Fetch contact leads
      const { data: contactLeads, error: contactError } = await supabase
        .from('contacts')
        .select(`
          id, 
          first_name, 
          last_name, 
          email, 
          phone, 
          position, 
          address,
          created_at,
          customers(name)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('is_lead', true)
        .eq('active', true);

      if (contactError) throw contactError;

      contactLeads?.forEach(contact => {
        allLeads.push({
          id: contact.id,
          name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
          type: 'contact' as const,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          address: contact.address || undefined,
          position: contact.position || undefined,
          customer_name: contact.customers?.name,
          first_name: contact.first_name,
          last_name: contact.last_name || undefined,
          created_at: contact.created_at,
        });
      });

      // Fetch company leads
      const { data: companyLeads, error: companyError } = await supabase
        .from('companies')
        .select('id, name, email, phone, website, headquarters, industry, created_at')
        .eq('tenant_id', currentTenant.id)
        .eq('is_lead', true)
        .eq('active', true);

      if (companyError) throw companyError;

      companyLeads?.forEach(company => {
        allLeads.push({
          id: company.id,
          name: company.name,
          type: 'company' as const,
          email: company.email || undefined,
          phone: company.phone || undefined,
          website: company.website || undefined,
          address: company.headquarters || undefined,
          industry: company.industry || undefined,
          created_at: company.created_at,
        });
      });

      // Fetch site leads
      const { data: siteLeads, error: siteError } = await supabase
        .from('sites')
        .select(`
          id, 
          name, 
          address, 
          city, 
          state, 
          country,
          created_at,
          customers(name)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('is_lead', true)
        .eq('active', true);

      if (siteError) throw siteError;

      siteLeads?.forEach(site => {
        const fullAddress = [site.address, site.city, site.state, site.country]
          .filter(Boolean)
          .join(', ');
        
        allLeads.push({
          id: site.id,
          name: site.name,
          type: 'site' as const,
          address: fullAddress,
          customer_name: site.customers?.name,
          created_at: site.created_at,
        });
      });

      // Sort by creation date (newest first)
      allLeads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setLeads(allLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentTenant]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || lead.type === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const getLeadIcon = (type: string) => {
    switch (type) {
      case 'contact': return User;
      case 'company': return Building2;
      case 'site': return MapPin;
      default: return Target;
    }
  };

  const getLeadTypeColor = (type: string) => {
    switch (type) {
      case 'contact': return 'bg-blue-500';
      case 'company': return 'bg-green-500';
      case 'site': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const leadCounts = {
    all: leads.length,
    contact: leads.filter(l => l.type === 'contact').length,
    company: leads.filter(l => l.type === 'company').length,
    site: leads.filter(l => l.type === 'site').length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading leads...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground">
              Manage all your potential business opportunities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Target className="h-4 w-4 mr-2" />
              {leadCounts.all} Total Leads
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({leadCounts.all})</TabsTrigger>
            <TabsTrigger value="contact">Contacts ({leadCounts.contact})</TabsTrigger>
            <TabsTrigger value="company">Companies ({leadCounts.company})</TabsTrigger>
            <TabsTrigger value="site">Sites ({leadCounts.site})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredLeads.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No leads found</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    {searchTerm 
                      ? 'No leads match your search criteria.' 
                      : 'Flag contacts, companies, or sites as leads to see them here.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredLeads.map((lead) => {
                  const IconComponent = getLeadIcon(lead.type);
                  return (
                    <Card key={`${lead.type}-${lead.id}`} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-full ${getLeadTypeColor(lead.type)}`}>
                              <IconComponent className="h-4 w-4 text-white" />
                            </div>
                            <CardTitle className="text-lg">{lead.name}</CardTitle>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {lead.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {lead.position && (
                            <p className="text-sm font-medium text-muted-foreground">
                              {lead.position}
                            </p>
                          )}
                          
                          {lead.industry && (
                            <p className="text-sm font-medium text-muted-foreground">
                              Industry: {lead.industry}
                            </p>
                          )}

                          {lead.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{lead.email}</p>
                            </div>
                          )}
                          
                          {lead.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{lead.phone}</p>
                            </div>
                          )}
                          
                          {lead.website && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{lead.website}</p>
                            </div>
                          )}
                          
                          {lead.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">{lead.address}</p>
                            </div>
                          )}
                          
                          {lead.customer_name && (
                            <p className="text-sm text-muted-foreground">
                              Customer: {lead.customer_name}
                            </p>
                          )}
                          
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(lead.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Leads;