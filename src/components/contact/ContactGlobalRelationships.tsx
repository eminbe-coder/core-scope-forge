import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, Building, MapPin, Briefcase, DollarSign, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface ContactGlobalRelationshipsProps {
  contactId: string;
  contactName: string;
}

interface RelatedDeal {
  id: string;
  name: string;
  value?: number;
  status: string;
  stage?: { name: string };
  currencies?: { symbol: string };
  created_at: string;
}

interface RelatedContract {
  id: string;
  name: string;
  value?: number;
  status: string;
  currencies?: { symbol: string };
  created_at: string;
}

interface RelatedSite {
  id: string;
  name: string;
  address?: string;
  created_at: string;
}

interface RelatedCompany {
  id: string;
  name: string;
  industry?: string;
  created_at: string;
}

export function ContactGlobalRelationships({ contactId, contactName }: ContactGlobalRelationshipsProps) {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deals');
  
  const [deals, setDeals] = useState<RelatedDeal[]>([]);
  const [contracts, setContracts] = useState<RelatedContract[]>([]);
  const [sites, setSites] = useState<RelatedSite[]>([]);
  const [companies, setCompanies] = useState<RelatedCompany[]>([]);

  useEffect(() => {
    if (currentTenant?.id && contactId) {
      fetchAllRelationships();
    }
  }, [currentTenant?.id, contactId]);

  const fetchAllRelationships = async () => {
    if (!currentTenant?.id) return;
    
    setLoading(true);
    try {
      // Fetch deals where contact is linked via deal_contacts junction
      const { data: dealContactLinks } = await supabase
        .from('deal_contacts')
        .select('deal_id')
        .eq('contact_id', contactId) as { data: { deal_id: string }[] | null };

      const linkedDealIds = dealContactLinks?.map(d => d.deal_id) || [];

      // Fetch deals from direct contact_id and junction combined
      let allDealIds = [...linkedDealIds];
      
      // Also check for direct contact_id on deals
      const directDealsResult = await (supabase as any)
        .from('deals')
        .select('id')
        .eq('contact_id', contactId)
        .eq('tenant_id', currentTenant.id);
      const directDeals: { id: string }[] | null = directDealsResult.data;

      if (directDeals) {
        allDealIds = [...allDealIds, ...directDeals.map(d => d.id)];
      }

      // Fetch actual deal data for all IDs
      const uniqueDealIds = [...new Set(allDealIds)];
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
      }

      // Fetch contracts where contact is linked via contract_contacts junction
      const { data: contractContactLinks } = await supabase
        .from('contract_contacts')
        .select('contract_id')
        .eq('contact_id', contactId) as { data: { contract_id: string }[] | null };

      if (contractContactLinks && contractContactLinks.length > 0) {
        const contractIds = contractContactLinks.map(c => c.contract_id);
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
      }

      // Fetch sites linked via contact_sites
      const { data: siteLinks } = await supabase
        .from('contact_sites')
        .select('site_id')
        .eq('contact_id', contactId) as { data: { site_id: string }[] | null };

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
      }

      // Fetch companies linked via company_contacts
      const { data: companyLinks } = await supabase
        .from('company_contacts')
        .select('company_id')
        .eq('contact_id', contactId) as { data: { company_id: string }[] | null };

      if (companyLinks && companyLinks.length > 0) {
        const companyIds = companyLinks.map(c => c.company_id);
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name, industry, created_at')
          .in('id', companyIds)
          .is('deleted_at', null) as { data: any[] | null };

        setCompanies((companiesData || []).map(c => ({
          id: c.id,
          name: c.name,
          industry: c.industry,
          created_at: c.created_at
        })));
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
          Global Relationships for {contactName}
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
            <TabsTrigger value="companies" className="gap-2">
              <Building className="h-4 w-4" />
              Companies ({companies.length})
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
                      <Badge variant="outline">{deal.stage?.name || deal.status}</Badge>
                      {deal.value && <span>{formatCurrency(deal.value, deal.currencies?.symbol)}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/deals/edit/${deal.id}`)}>
                    View
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No deals linked to this contact.</p>
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
                      {contract.value && <span>{formatCurrency(contract.value, contract.currencies?.symbol)}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/contracts/${contract.id}`)}>
                    View
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No contracts linked to this contact.</p>
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
              <p className="text-center py-8 text-muted-foreground">No sites linked to this contact.</p>
            )}
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies" className="mt-4 space-y-3">
            {companies.length > 0 ? (
              companies.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium">{company.name}</p>
                    {company.industry && <p className="text-sm text-muted-foreground">{company.industry}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/companies/${company.id}`)}>
                    View
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">No companies linked to this contact.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
