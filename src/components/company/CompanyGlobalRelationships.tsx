import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, User, MapPin, Briefcase, DollarSign, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface CompanyGlobalRelationshipsProps {
  companyId: string;
  companyName: string;
}

interface RelatedDeal {
  id: string;
  name: string;
  value?: number;
  status: string;
  created_at: string;
}

interface RelatedContract {
  id: string;
  name: string;
  value?: number;
  status: string;
  created_at: string;
}

interface RelatedSite {
  id: string;
  name: string;
  address?: string;
  created_at: string;
}

interface RelatedContact {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  position?: string;
  created_at: string;
}

export function CompanyGlobalRelationships({ companyId, companyName }: CompanyGlobalRelationshipsProps) {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deals');
  
  const [deals, setDeals] = useState<RelatedDeal[]>([]);
  const [contracts, setContracts] = useState<RelatedContract[]>([]);
  const [sites, setSites] = useState<RelatedSite[]>([]);
  const [contacts, setContacts] = useState<RelatedContact[]>([]);

  useEffect(() => {
    if (currentTenant?.id && companyId) {
      fetchAllRelationships();
    }
  }, [currentTenant?.id, companyId]);

  const fetchAllRelationships = async () => {
    if (!currentTenant?.id) return;
    
    setLoading(true);
    try {
      // Fetch deals linked via company_deals junction OR deal_companies
      const { data: dealCompanyLinks } = await supabase
        .from('company_deals')
        .select('deal_id')
        .eq('company_id', companyId) as { data: { deal_id: string }[] | null };

      const { data: dealCompanyLinks2 } = await supabase
        .from('deal_companies')
        .select('deal_id')
        .eq('company_id', companyId) as { data: { deal_id: string }[] | null };

      const linkedDealIds = [
        ...(dealCompanyLinks?.map(d => d.deal_id) || []),
        ...(dealCompanyLinks2?.map(d => d.deal_id) || [])
      ];

      // Fetch actual deal data for all IDs
      const uniqueDealIds = [...new Set(linkedDealIds)];
      if (uniqueDealIds.length > 0) {
        const { data: dealsData } = await supabase
          .from('deals')
          .select('id, name, value, status, created_at')
          .in('id', uniqueDealIds)
          .is('deleted_at', null) as { data: any[] | null };

        setDeals((dealsData || []).map(d => ({
          id: d.id,
          name: d.name,
          value: d.value,
          status: d.status,
          created_at: d.created_at
        })));
      } else {
        setDeals([]);
      }

      // Fetch contracts linked via contract_companies junction
      const { data: contractCompanyLinks } = await supabase
        .from('contract_companies')
        .select('contract_id')
        .eq('company_id', companyId) as { data: { contract_id: string }[] | null };

      if (contractCompanyLinks && contractCompanyLinks.length > 0) {
        const contractIds = contractCompanyLinks.map(c => c.contract_id);
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('id, name, value, status, created_at')
          .in('id', contractIds)
          .is('deleted_at', null) as { data: any[] | null };
        
        setContracts((contractsData || []).map(c => ({
          id: c.id,
          name: c.name,
          value: c.value,
          status: c.status,
          created_at: c.created_at
        })));
      } else {
        setContracts([]);
      }

      // Fetch sites linked via company_sites
      const { data: siteLinks } = await supabase
        .from('company_sites')
        .select('site_id')
        .eq('company_id', companyId) as { data: { site_id: string }[] | null };

      if (siteLinks && siteLinks.length > 0) {
        const siteIds = siteLinks.map(s => s.site_id);
        const { data: sitesData } = await supabase
          .from('sites')
          .select('id, name, address, created_at')
          .in('id', siteIds)
          .is('deleted_at', null) as { data: any[] | null };

        setSites((sitesData || []).map(s => ({
          id: s.id,
          name: s.name,
          address: s.address,
          created_at: s.created_at
        })));
      } else {
        setSites([]);
      }

      // Fetch contacts linked via company_contacts
      const { data: contactLinks } = await supabase
        .from('company_contacts')
        .select('contact_id')
        .eq('company_id', companyId) as { data: { contact_id: string }[] | null };

      if (contactLinks && contactLinks.length > 0) {
        const contactIds = contactLinks.map(c => c.contact_id);
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, position, created_at')
          .in('id', contactIds)
          .is('deleted_at', null) as { data: any[] | null };

        setContacts((contactsData || []).map(c => ({
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          email: c.email,
          position: c.position,
          created_at: c.created_at
        })));
      } else {
        setContacts([]);
      }

    } catch (error) {
      console.error('Error fetching relationships:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, symbol?: string) => {
    return `${symbol || '$'}${value.toLocaleString()}`;
  };

  const totalDealsValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const totalContractsValue = contracts.reduce((sum, c) => sum + (c.value || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading relationships...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          360° View for {companyName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="deals" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Deals ({deals.length})
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2">
              <FileText className="h-4 w-4" />
              Contracts ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="sites" className="gap-2">
              <MapPin className="h-4 w-4" />
              Sites ({sites.length})
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <User className="h-4 w-4" />
              Contacts ({contacts.length})
            </TabsTrigger>
          </TabsList>

          {/* Deals Tab */}
          <TabsContent value="deals" className="mt-4 space-y-3">
            {deals.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Total Value: {formatCurrency(totalDealsValue)}
                </span>
              </div>
            )}
            {deals.length > 0 ? (
              deals.map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{deal.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{deal.status}</Badge>
                      {deal.value && <span>{formatCurrency(deal.value)}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/deals/edit/${deal.id}`)}>
                    View
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No deals linked to this company.</p>
            )}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="mt-4 space-y-3">
            {contracts.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Total Value: {formatCurrency(totalContractsValue)}
                </span>
              </div>
            )}
            {contracts.length > 0 ? (
              contracts.map((contract) => (
                <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{contract.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{contract.status}</Badge>
                      {contract.value && <span>{formatCurrency(contract.value)}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/contracts/${contract.id}`)}>
                    View
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No contracts linked to this company.</p>
            )}
          </TabsContent>

          {/* Sites Tab */}
          <TabsContent value="sites" className="mt-4 space-y-3">
            {sites.length > 0 ? (
              sites.map((site) => (
                <div key={site.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{site.name}</p>
                    {site.address && <p className="text-sm text-muted-foreground">{site.address}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/sites/${site.id}`)}>
                    View
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No sites linked to this company.</p>
            )}
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="mt-4 space-y-3">
            {contacts.length > 0 ? (
              contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{contact.first_name} {contact.last_name || ''}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {contact.position && <span>{contact.position}</span>}
                      {contact.email && <span>• {contact.email}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/contacts/${contact.id}`)}>
                    View
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No contacts linked to this company.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
