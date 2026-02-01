import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Phone, Building, MapPin, Users, Edit, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { TodoWidget } from '@/components/todos/TodoWidget';
import { ContactTodos } from '@/components/contact/ContactTodos';
import { ContactGlobalRelationships } from '@/components/contact/ContactGlobalRelationships';
import { CompanySelect, SiteSelect } from '@/components/ui/entity-select';

interface Contact {
  id: string;
  tenant_id: string;
  customer_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  country_code?: string;
  phone_number?: string;
  position?: string;
  address?: string;
  notes?: string;
  active: boolean;
  is_lead?: boolean;
  high_value?: boolean;
  customers?: {
    id: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
  address: string;
}

interface Deal {
  id: string;
  name: string;
  value?: number;
  status: string;
  currencies?: {
    symbol: string;
  };
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  stage_id?: string;
}

const ContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant && id) {
      fetchContactData();
    }
  }, [currentTenant, id]);

  const fetchContactData = async () => {
    if (!currentTenant || !id) return;

    try {
      // Fetch contact details
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select(`
          *,
          customers(id, name)
        `)
        .eq('id', id)
        .eq('tenant_id', currentTenant.id)
        .single();

      if (contactError) throw contactError;
      setContact(contactData);

      // Fetch related companies through company_contacts
      const { data: companyData, error: companyError } = await supabase
        .from('company_contacts')
        .select(`
          companies(id, name)
        `)
        .eq('contact_id', id);

      if (companyError) throw companyError;
      setCompanies(companyData?.map(cc => cc.companies).filter(Boolean) || []);

      // Fetch related sites through contact_sites
      const { data: siteData, error: siteError } = await supabase
        .from('contact_sites')
        .select(`
          sites(id, name, address)
        `)
        .eq('contact_id', id);

      if (siteError) throw siteError;
      setSites(siteData?.map(cs => cs.sites).filter(Boolean) || []);

      // Fetch related deals where this contact is linked
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(`
          id, name, value, status,
          currencies(symbol)
        `)
        .or(`contact_id.eq.${id},assigned_to.eq.${id}`)
        .eq('tenant_id', currentTenant.id);

      if (dealError) throw dealError;
      setDeals(dealData || []);

      // Fetch leads if this contact is marked as a lead
      if (contactData?.is_lead) {
        const { data: leadData, error: leadError } = await supabase
          .from('contacts')
          .select(`
            id, first_name, last_name, email, phone, stage_id
          `)
          .eq('id', id)
          .eq('is_lead', true)
          .eq('tenant_id', currentTenant.id);

        if (leadError) throw leadError;
        setLeads(leadData || []);
      }

    } catch (error: any) {
      console.error('Error fetching contact data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contact details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCompany = async (companyId: string) => {
    if (!id || !companyId) return;

    try {
      const { error } = await supabase
        .from('company_contacts')
        .insert({
          company_id: companyId,
          contact_id: id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Company linked successfully',
      });

      fetchContactData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleLinkSite = async (siteId: string) => {
    if (!id || !siteId) return;

    try {
      const { error } = await supabase
        .from('contact_sites')
        .insert({
          site_id: siteId,
          contact_id: id
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Site linked successfully',
      });

      fetchContactData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUnlinkCompany = async (companyId: string) => {
    if (!id || !companyId) return;

    try {
      const { error } = await supabase
        .from('company_contacts')
        .delete()
        .eq('company_id', companyId)
        .eq('contact_id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Company unlinked successfully',
      });

      fetchContactData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUnlinkSite = async (siteId: string) => {
    if (!id || !siteId) return;

    try {
      const { error } = await supabase
        .from('contact_sites')
        .delete()
        .eq('site_id', siteId)
        .eq('contact_id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Site unlinked successfully',
      });

      fetchContactData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading contact details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contact) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">Contact not found</p>
            <Button onClick={() => navigate('/contacts')} className="mt-4">
              Back to Contacts
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const fullName = `${contact.first_name} ${contact.last_name || ''}`.trim();
  const phoneDisplay = contact.country_code && contact.phone_number 
    ? `${contact.country_code} ${contact.phone_number}`
    : contact.phone;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/contacts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{fullName}</h1>
              <p className="text-muted-foreground">Contact Details</p>
            </div>
          </div>
          <Button onClick={() => navigate(`/contacts/edit/${id}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Contact
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Contact Details */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="font-medium">{fullName}</p>
                </div>

                {contact.email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p>{contact.email}</p>
                    </div>
                  </div>
                )}

                {phoneDisplay && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p>{phoneDisplay}</p>
                    </div>
                  </div>
                )}

                {contact.position && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Position</p>
                    <p>{contact.position}</p>
                  </div>
                )}

                {contact.address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p>{contact.address}</p>
                    </div>
                  </div>
                )}

                {contact.customers && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Customer</p>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <p>{contact.customers.name}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {contact.is_lead && (
                    <Badge variant="secondary">Lead</Badge>
                  )}
                  {contact.high_value && (
                    <Badge variant="default">High Value</Badge>
                  )}
                </div>

                {contact.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{contact.notes}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(contact.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updated: {new Date(contact.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Tabbed View for Relationships and Activities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Companies Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Companies ({companies.length})
                  </div>
                  <div className="flex gap-2">
                    <CompanySelect
                      value=""
                      onValueChange={handleLinkCompany}
                      placeholder="Link company"
                      showQuickAdd={false}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {companies.length > 0 ? (
                  <div className="space-y-2">
                    {companies.map((company) => (
                      <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{company.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkCompany(company.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No companies linked to this contact.</p>
                )}
              </CardContent>
            </Card>

            {/* Sites Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Sites ({sites.length})
                  </div>
                  <div className="flex gap-2">
                    <SiteSelect
                      value=""
                      onValueChange={handleLinkSite}
                      placeholder="Link site"
                      showQuickAdd={false}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sites.length > 0 ? (
                  <div className="space-y-2">
                    {sites.map((site) => (
                      <div key={site.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{site.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">{site.address}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkSite(site.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No sites linked to this contact.</p>
                )}
              </CardContent>
            </Card>

            {/* Leads Widget */}
            {contact.is_lead && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Lead Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="secondary">Active Lead</Badge>
                    {leads.map((lead) => (
                      <div key={lead.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                            <Badge variant="outline">Lead Stage</Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/leads/${lead.id}`)}
                          >
                            View Lead
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Deals Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Related Deals ({deals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deals.length > 0 ? (
                  <div className="space-y-2">
                    {deals.map((deal) => (
                      <div key={deal.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{deal.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{deal.status}</Badge>
                            {deal.value && (
                              <span>
                                {deal.currencies?.symbol || '$'}{deal.value.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/deals/edit/${deal.id}`)}
                        >
                          View Deal
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No deals associated with this contact.</p>
                )}
              </CardContent>
            </Card>

            {/* Global 360-View Relationships */}
            <ContactGlobalRelationships
              contactId={id!}
              contactName={fullName}
            />
          </div>
        </div>

        {/* Activity Section */}
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold mb-4">Activities & Tasks</h2>
              <TodoWidget
                entityType="contact"
                entityId={id!}
                canEdit={true}
                compact={false}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">Related Tasks</h2>
              <ContactTodos
                contactId={id!}
                contactName={contact ? `${contact.first_name} ${contact.last_name}` : 'Contact'}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContactDetail;