import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Calendar, FileText, CheckSquare, Building2, Users, Plus, Search, X, FileSignature, UserCheck, Link } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SiteTodos } from '@/components/site-details/SiteTodos';
import { SiteStatistics } from '@/components/site-details/SiteStatistics';
import { SiteActivityTimeline } from '@/components/site-details/SiteActivityTimeline';
import { SiteRelationships } from '@/components/site-details/SiteRelationships';
import { MapDisplay } from '@/components/ui/map-display';
import { CreateDealForm } from '@/components/forms/CreateDealForm';
import { CreateContractForm } from '@/components/forms/CreateContractForm';
import { CreateContactForm } from '@/components/forms/CreateContactForm';
import { CreateCompanyForm } from '@/components/forms/CreateCompanyForm';
import { useDynamicDeals, useDynamicContracts, useDynamicContacts, useDynamicCompanies } from '@/hooks/use-dynamic-entities';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';

import { TodoDetailModal } from '@/components/todos/TodoDetailModal';

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

interface Contract {
  id: string;
  name: string;
  value: number;
  status: string;
  created_at: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  stage_id?: string;
  created_at: string;
}

const SiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [site, setSite] = useState<Site | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTodo, setSelectedTodo] = useState<any>(null);
  const [todoDetailOpen, setTodoDetailOpen] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [linkContactDialog, setLinkContactDialog] = useState(false);
  const [linkCompanyDialog, setLinkCompanyDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [contactNote, setContactNote] = useState('');
  const [companyNote, setCompanyNote] = useState('');
  
  // Quick action states
  const [linkDealDialog, setLinkDealDialog] = useState(false);
  const [linkContractDialog, setLinkContractDialog] = useState(false);
  const [linkLeadDialog, setLinkLeadDialog] = useState(false);
  const [createDealDialog, setCreateDealDialog] = useState(false);
  const [createContractDialog, setCreateContractDialog] = useState(false);
  const [createLeadDialog, setCreateLeadDialog] = useState(false);
  const [leadType, setLeadType] = useState<'contact' | 'company'>('contact');
  const [selectedDeal, setSelectedDeal] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  const [selectedLead, setSelectedLead] = useState('');

  // UUID validation helper
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // Validate UUID early
  if (id && !isValidUUID(id)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-lg font-semibold">Invalid Site ID</p>
            <p className="text-muted-foreground mb-4">The provided site ID is not valid.</p>
            <Button onClick={() => navigate('/sites')} className="mt-4">
              Back to Sites
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);
  
  // Dynamic entity hooks for quick actions
  const { deals: availableDeals } = useDynamicDeals({ enabled: linkDealDialog });
  const { contracts: availableContracts } = useDynamicContracts({ enabled: linkContractDialog });
  const { contacts: availableLeadContacts } = useDynamicContacts({ enabled: linkLeadDialog && leadType === 'contact' });
  const { companies: availableLeadCompanies } = useDynamicCompanies({ enabled: linkLeadDialog && leadType === 'company' });

  useEffect(() => {
    if (currentTenant && id) {
      fetchSiteData();
      loadAvailableContacts();
      loadAvailableCompanies();
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
        .maybeSingle();

      if (siteError) throw siteError;
      setSite(siteData);

      if (!siteData) {
        toast({
          title: 'Error',
          description: 'Site not found',
          variant: 'destructive',
        });
        return;
      }

      // Fetch deals connected to this site
      const dealsQuery = await supabase
        .from('deals')
        .select('id, name, value, status, created_at')
        .eq('site_id', id)
        .eq('tenant_id', currentTenant?.id);

      if (dealsQuery.error) throw dealsQuery.error;
      setDeals(dealsQuery.data || []);

      // Fetch contracts connected to this site
      const contractsQuery = await supabase
        .from('contracts')
        .select('id, name, value, status, created_at')
        .eq('site_id', id)
        .eq('tenant_id', currentTenant?.id);

      if (contractsQuery.error) throw contractsQuery.error;
      setContracts(contractsQuery.data || []);

      // Fetch leads connected to this site
      const leadsQuery = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, stage_id, created_at')
        .eq('tenant_id', currentTenant?.id)
        .eq('is_lead', true)
        .or(`id.eq.${id},notes.ilike.%${id}%`);

      if (leadsQuery.error) throw leadsQuery.error;
      setLeads(leadsQuery.data || []);

      // Fetch linked contacts with notes
      const contactLinksQuery = await supabase
        .from('contact_sites')
        .select(`
          notes,
          contacts(id, first_name, last_name, email, created_at)
        `)
        .eq('site_id', id);

      if (contactLinksQuery.error) throw contactLinksQuery.error;
      
      const linkedContacts = contactLinksQuery.data?.map(link => ({
        id: (link.contacts as any)?.id,
        first_name: (link.contacts as any)?.first_name,
        last_name: (link.contacts as any)?.last_name,
        email: (link.contacts as any)?.email,
        created_at: (link.contacts as any)?.created_at,
        notes: link.notes,
      })).filter(contact => contact.id) || [];
      
      setContacts(linkedContacts);

      // Fetch linked companies with notes
      const companyLinksQuery = await supabase
        .from('company_sites')
        .select(`
          notes,
          companies(id, name, email, created_at)
        `)
        .eq('site_id', id);

      if (companyLinksQuery.error) throw companyLinksQuery.error;
      
      const linkedCompanies = companyLinksQuery.data?.map(link => ({
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
        description: `Failed to load site details: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableContacts = async () => {
    try {
      // Get already linked contact IDs
      const { data: linkedContacts } = await supabase
        .from('contact_sites')
        .select('contact_id')
        .eq('site_id', id);

      const linkedContactIds = linkedContacts?.map(link => link.contact_id) || [];

      // Get available contacts excluding already linked ones
      let query = supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true)
        .order('first_name');

      if (linkedContactIds.length > 0) {
        query = query.not('id', 'in', `(${linkedContactIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAvailableContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadAvailableCompanies = async () => {
    try {
      // Get already linked company IDs
      const { data: linkedCompanies } = await supabase
        .from('company_sites')
        .select('company_id')
        .eq('site_id', id);

      const linkedCompanyIds = linkedCompanies?.map(link => link.company_id) || [];

      // Get available companies excluding already linked ones
      let query = supabase
        .from('companies')
        .select('id, name, email')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true)
        .order('name');

      if (linkedCompanyIds.length > 0) {
        query = query.not('id', 'in', `(${linkedCompanyIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAvailableCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const linkContactToSite = async () => {
    if (!selectedContact || !id) return;

    try {
      const { error } = await supabase
        .from('contact_sites')
        .insert({
          contact_id: selectedContact,
          site_id: id,
          notes: contactNote || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'This contact is already linked to this site',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Contact linked to site successfully',
      });

      // Refresh the data
      fetchSiteData();
      loadAvailableContacts();
      setLinkContactDialog(false);
      setSelectedContact('');
      setContactNote('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const linkCompanyToSite = async () => {
    if (!selectedCompany || !id) return;

    try {
      const { error } = await supabase
        .from('company_sites')
        .insert({
          company_id: selectedCompany,
          site_id: id,
          notes: companyNote || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Error',
            description: 'This company is already linked to this site',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Company linked to site successfully',
      });

      // Refresh the data
      fetchSiteData();
      loadAvailableCompanies();
      setLinkCompanyDialog(false);
      setSelectedCompany('');
      setCompanyNote('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const unlinkContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('contact_sites')
        .delete()
        .eq('contact_id', contactId)
        .eq('site_id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Contact unlinked from site',
      });

      fetchSiteData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const unlinkCompany = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('company_sites')
        .delete()
        .eq('company_id', companyId)
        .eq('site_id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Company unlinked from site',
      });

      fetchSiteData();
      loadAvailableCompanies();
      loadAvailableContacts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Quick action functions
  const linkDealToSite = async () => {
    if (!selectedDeal || !id) return;
    
    try {
      const { error } = await supabase
        .from('deals')
        .update({ site_id: id })
        .eq('id', selectedDeal);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Deal linked to site successfully',
      });

      fetchSiteData();
      setLinkDealDialog(false);
      setSelectedDeal('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const linkContractToSite = async () => {
    if (!selectedContract || !id) return;
    
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ site_id: id })
        .eq('id', selectedContract);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Contract linked to site successfully',
      });

      fetchSiteData();
      setLinkContractDialog(false);
      setSelectedContract('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const linkLeadToSite = async () => {
    if (!selectedLead || !id) return;
    
    try {
      if (leadType === 'contact') {
        // Mark contact as lead and link to site
        await supabase.from('contacts').update({ is_lead: true }).eq('id', selectedLead);
        await supabase.from('contact_sites').insert({
          contact_id: selectedLead,
          site_id: id,
          notes: 'Linked as lead'
        });
      } else {
        // Mark company as lead and link to site
        await supabase.from('companies').update({ is_lead: true }).eq('id', selectedLead);
        await supabase.from('company_sites').insert({
          company_id: selectedLead,
          site_id: id,
          notes: 'Linked as lead'
        });
      }

      toast({
        title: 'Success',
        description: 'Lead linked to site successfully',
      });

      fetchSiteData();
      setLinkLeadDialog(false);
      setSelectedLead('');
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

        {/* Site Statistics Dashboard */}
        <SiteStatistics siteId={site.id} />

        {/* Site Information and Location Details - Side by Side */}
        <div className="grid gap-6 md:grid-cols-2">
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
              {site.city && (
                <div>
                  <p className="text-sm font-medium">City</p>
                  <p className="text-sm text-muted-foreground">{site.city}</p>
                </div>
              )}
              {site.state && (
                <div>
                  <p className="text-sm font-medium">State/Province</p>
                  <p className="text-sm text-muted-foreground">{site.state}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium">Country</p>
                <p className="text-sm text-muted-foreground">{site.country}</p>
              </div>
              {site.postal_code && (
                <div>
                  <p className="text-sm font-medium">Postal Code</p>
                  <p className="text-sm text-muted-foreground">{site.postal_code}</p>
                </div>
              )}
              {site.latitude && site.longitude && (
                <div>
                  <p className="text-sm font-medium">Coordinates</p>
                  <p className="text-sm text-muted-foreground">{site.latitude}, {site.longitude}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map Display */}
        <MapDisplay
          latitude={site.latitude || 0}
          longitude={site.longitude || 0}
          siteName={site.name}
          address={site.address}
        />

        {/* Business Items Lists - Deals, Contracts, Leads */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Deals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Deals ({deals.length})
              </CardTitle>
              <div className="flex gap-1">
                <Dialog open={linkDealDialog} onOpenChange={setLinkDealDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Link className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Link Existing Deal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <SearchableSelect
                        value={selectedDeal}
                        onValueChange={setSelectedDeal}
                        placeholder="Search deals..."
                        searchPlaceholder="Type to search deals..."
                        emptyText="No deals found"
                        options={availableDeals.map(deal => ({
                          id: deal.id,
                          name: deal.name,
                          value: deal.value,
                          status: deal.status
                        }))}
                        renderOption={(deal) => `${deal.name} - $${deal.value?.toLocaleString() || '0'} (${deal.status})`}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setLinkDealDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={linkDealToSite} disabled={!selectedDeal}>
                          Link Deal
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={createDealDialog} onOpenChange={setCreateDealDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Deal</DialogTitle>
                    </DialogHeader>
                    <CreateDealForm 
                      leadType="site"
                      leadId={id}
                      onSuccess={() => {
                        setCreateDealDialog(false);
                        fetchSiteData();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {deals.length > 0 ? (
                <div className="space-y-3">
                  {deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => navigate(`/deals/edit/${deal.id}`)}
                    >
                      <h4 className="font-medium text-sm">{deal.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {deal.status.replace('_', ' ')}
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        ${deal.value?.toLocaleString() || '0'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No deals yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contracts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-4 w-4" />
                Contracts ({contracts.length})
              </CardTitle>
              <div className="flex gap-1">
                <Dialog open={linkContractDialog} onOpenChange={setLinkContractDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Link className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Link Existing Contract</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <SearchableSelect
                        value={selectedContract}
                        onValueChange={setSelectedContract}
                        placeholder="Search contracts..."
                        searchPlaceholder="Type to search contracts..."
                        emptyText="No contracts found"
                        options={availableContracts.map(contract => ({
                          id: contract.id,
                          name: contract.name,
                          value: (contract as any).value,
                          status: contract.status
                        }))}
                        renderOption={(contract) => `${contract.name} - $${(contract as any).value?.toLocaleString() || '0'} (${contract.status})`}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setLinkContractDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={linkContractToSite} disabled={!selectedContract}>
                          Link Contract
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={createContractDialog} onOpenChange={setCreateContractDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Contract</DialogTitle>
                    </DialogHeader>
                    <CreateContractForm 
                      onSuccess={() => {
                        setCreateContractDialog(false);
                        fetchSiteData();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {contracts.length > 0 ? (
                <div className="space-y-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => navigate(`/contracts/edit/${contract.id}`)}
                    >
                      <h4 className="font-medium text-sm">{contract.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {contract.status.replace('_', ' ')}
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        ${contract.value?.toLocaleString() || '0'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No contracts yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Leads ({leads.length})
              </CardTitle>
              <div className="flex gap-1">
                <Dialog open={linkLeadDialog} onOpenChange={setLinkLeadDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Link className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Link Existing Lead</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Lead Type</Label>
                        <div className="flex gap-2 mt-1">
                          <Button
                            type="button"
                            variant={leadType === 'contact' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLeadType('contact')}
                          >
                            Contact
                          </Button>
                          <Button
                            type="button"
                            variant={leadType === 'company' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLeadType('company')}
                          >
                            Company
                          </Button>
                        </div>
                      </div>
                      <SearchableSelect
                        value={selectedLead}
                        onValueChange={setSelectedLead}
                        placeholder={`Search ${leadType}s...`}
                        searchPlaceholder={`Type to search ${leadType}s...`}
                        emptyText={`No ${leadType}s found`}
                        options={leadType === 'contact' 
                          ? availableLeadContacts.map(contact => ({
                              id: contact.id,
                              name: `${contact.first_name} ${contact.last_name}`,
                              email: contact.email
                            }))
                          : availableLeadCompanies.map(company => ({
                              id: company.id,
                              name: company.name,
                              email: (company as any).email
                            }))
                        }
                        renderOption={(item) => `${item.name}${item.email ? ` (${item.email})` : ''}`}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setLinkLeadDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={linkLeadToSite} disabled={!selectedLead}>
                          Link Lead
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={createLeadDialog} onOpenChange={setCreateLeadDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Lead</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Lead Type</Label>
                        <div className="flex gap-2 mt-1">
                          <Button
                            type="button"
                            variant={leadType === 'contact' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLeadType('contact')}
                          >
                            Contact Lead
                          </Button>
                          <Button
                            type="button"
                            variant={leadType === 'company' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setLeadType('company')}
                          >
                            Company Lead
                          </Button>
                        </div>
                      </div>
                      {leadType === 'contact' ? (
                        <CreateContactForm 
                          onSuccess={() => {
                            setCreateLeadDialog(false);
                            fetchSiteData();
                          }}
                        />
                      ) : (
                        <CreateCompanyForm 
                          onSuccess={() => {
                            setCreateLeadDialog(false);
                            fetchSiteData();
                          }}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {leads.length > 0 ? (
                <div className="space-y-3">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => navigate(`/leads/edit/${lead.id}`)}
                    >
                      <h4 className="font-medium text-sm">
                        {lead.first_name} {lead.last_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {lead.email || 'No email'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No leads yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Todos Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Site Todos
            </CardTitle>
          </CardHeader>
          <CardContent>
          <SiteTodos 
            siteId={site.id} 
            siteName={site.name} 
            onTodoClick={(todo) => {
              setSelectedTodo(todo);
              setTodoDetailOpen(true);
            }}
          />
          </CardContent>
        </Card>

        {/* Site Relationships */}
        <SiteRelationships siteId={site.id} />

        {/* Contacts and Companies Tabs */}
        <Tabs defaultValue="contacts" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies ({companies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Linked Contacts</CardTitle>
                <div className="flex gap-2">
                  <Dialog open={linkContactDialog} onOpenChange={setLinkContactDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        Link Contact
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Link Contact to Site</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="contact-select">Select Contact</Label>
                          <SearchableSelect
                            value={selectedContact}
                            onValueChange={setSelectedContact}
                            placeholder="Search contacts..."
                            searchPlaceholder="Type to search contacts..."
                            emptyText="No contacts found"
                            options={availableContacts.map(contact => ({
                              id: contact.id,
                              first_name: contact.first_name,
                              last_name: contact.last_name,
                              email: contact.email,
                            }))}
                            renderOption={(contact) => 
                              `${contact.first_name} ${contact.last_name} ${contact.email ? `(${contact.email})` : ''}`.trim()
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="contact-note">Relationship Note</Label>
                          <Textarea
                            id="contact-note"
                            placeholder="e.g., Project Manager, Site Supervisor..."
                            value={contactNote}
                            onChange={(e) => setContactNote(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setLinkContactDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={linkContactToSite} disabled={!selectedContact}>
                            Link Contact
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="outline" onClick={() => navigate('/contacts/add')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contacts.length > 0 ? (
                  <div className="space-y-4">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
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
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(contact.created_at).toLocaleDateString()}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unlinkContact(contact.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No contacts linked to this site yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Linked Companies</CardTitle>
                <div className="flex gap-2">
                  <Dialog open={linkCompanyDialog} onOpenChange={setLinkCompanyDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        Link Company
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Link Company to Site</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="company-select">Select Company</Label>
                          <SearchableSelect
                            value={selectedCompany}
                            onValueChange={setSelectedCompany}
                            placeholder="Search companies..."
                            searchPlaceholder="Type to search companies..."
                            emptyText="No companies found"
                            options={availableCompanies.map(company => ({
                              id: company.id,
                              name: company.name,
                              email: company.email,
                            }))}
                            renderOption={(company) => 
                              `${company.name} ${company.email ? `(${company.email})` : ''}`.trim()
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="company-note">Relationship Note</Label>
                          <Textarea
                            id="company-note"
                            placeholder="e.g., Site Interior, Construction Partner..."
                            value={companyNote}
                            onChange={(e) => setCompanyNote(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setLinkCompanyDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={linkCompanyToSite} disabled={!selectedCompany}>
                            Link Company
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="outline" onClick={() => navigate('/companies/add')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {companies.length > 0 ? (
                  <div className="space-y-4">
                    {companies.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
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
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(company.created_at).toLocaleDateString()}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unlinkCompany(company.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
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

        {/* Activity Timeline */}
        <div className="mt-6">
          <SiteActivityTimeline siteId={site.id} />
        </div>
      </div>

      {/* Todo Detail Modal */}
      {selectedTodo && (
        <TodoDetailModal
          todo={selectedTodo}
          isOpen={todoDetailOpen}
          onClose={() => {
            setTodoDetailOpen(false);
            setSelectedTodo(null);
          }}
          onUpdate={() => {
            // Refresh todo data
            fetchSiteData();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default SiteDetail;