import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Edit, ArrowRight, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useNavigate } from 'react-router-dom';

interface SiteBusinessItemsProps {
  siteId: string;
}

interface BusinessItem {
  id: string;
  name: string;
  type: 'deal' | 'contract' | 'lead';
  value: number | null;
  status: string;
  stage?: string;
  assignedTo?: string;
  nextAction?: string;
  createdAt: string;
  currency?: string;
}

export function SiteBusinessItems({ siteId }: SiteBusinessItemsProps) {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const [items, setItems] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (currentTenant && siteId) {
      fetchBusinessItems();
    }
  }, [currentTenant, siteId]);

  const fetchBusinessItems = async () => {
    try {
      const businessItems: BusinessItem[] = [];

      // Fetch deals
      const { data: deals } = await supabase
        .from('deals')
        .select(`
          id, name, value, status, created_at,
          deal_stages(name),
          assigned_profiles:profiles!deals_assigned_to_fkey(first_name, last_name),
          currencies(code)
        `)
        .eq('site_id', siteId)
        .eq('tenant_id', currentTenant?.id);

      if (deals) {
        deals.forEach(deal => {
          businessItems.push({
            id: deal.id,
            name: deal.name,
            type: 'deal',
            value: deal.value,
            status: deal.status,
            stage: deal.deal_stages?.name,
            assignedTo: deal.assigned_profiles ? `${deal.assigned_profiles.first_name} ${deal.assigned_profiles.last_name}` : undefined,
            createdAt: deal.created_at,
            currency: deal.currencies?.code,
            nextAction: getNextAction('deal', deal.status),
          });
        });
      }

      // Fetch contracts
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          id, name, value, status, created_at,
          assigned_profiles:profiles!contracts_assigned_to_fkey(first_name, last_name),
          currencies(code)
        `)
        .eq('site_id', siteId)
        .eq('tenant_id', currentTenant?.id);

      if (contracts) {
        contracts.forEach(contract => {
          businessItems.push({
            id: contract.id,
            name: contract.name,
            type: 'contract',
            value: contract.value,
            status: contract.status,
            assignedTo: contract.assigned_profiles ? `${contract.assigned_profiles.first_name} ${contract.assigned_profiles.last_name}` : undefined,
            createdAt: contract.created_at,
            currency: contract.currencies?.code,
            nextAction: getNextAction('contract', contract.status),
          });
        });
      }

      // Fetch leads (companies and contacts marked as leads related to this site)
      const { data: leadCompanies } = await supabase
        .from('companies')
        .select(`
          id, name, created_at,
          company_sites!inner(site_id)
        `)
        .eq('is_lead', true)
        .eq('company_sites.site_id', siteId)
        .eq('tenant_id', currentTenant?.id);

      if (leadCompanies) {
        leadCompanies.forEach(company => {
          businessItems.push({
            id: company.id,
            name: company.name,
            type: 'lead',
            value: null,
            status: 'lead',
            createdAt: company.created_at,
            nextAction: 'Convert to Deal',
          });
        });
      }

      const { data: leadContacts } = await supabase
        .from('contacts')
        .select(`
          id, first_name, last_name, created_at,
          contact_sites!inner(site_id)
        `)
        .eq('is_lead', true)
        .eq('contact_sites.site_id', siteId)
        .eq('tenant_id', currentTenant?.id);

      if (leadContacts) {
        leadContacts.forEach(contact => {
          businessItems.push({
            id: contact.id,
            name: `${contact.first_name} ${contact.last_name}`,
            type: 'lead',
            value: null,
            status: 'lead',
            createdAt: contact.created_at,
            nextAction: 'Convert to Deal',
          });
        });
      }

      // Sort by creation date (newest first)
      businessItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setItems(businessItems);
    } catch (error) {
      console.error('Error fetching business items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextAction = (type: string, status: string): string => {
    switch (type) {
      case 'deal':
        switch (status) {
          case 'lead': return 'Qualify Lead';
          case 'qualified': return 'Move to Next Stage';
          case 'proposal': return 'Follow Up';
          case 'won': return 'Create Contract';
          default: return 'Review';
        }
      case 'contract':
        switch (status) {
          case 'draft': return 'Send for Review';
          case 'active': return 'Monitor Progress';
          case 'signed': return 'Start Execution';
          default: return 'Review';
        }
      default:
        return 'Review';
    }
  };

  const getStatusColor = (type: string, status: string): string => {
    if (type === 'lead') return 'bg-blue-100 text-blue-800';
    
    switch (status) {
      case 'qualified':
      case 'active':
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'won':
        return 'bg-emerald-100 text-emerald-800';
      case 'lost':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'proposal':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const handleItemClick = (item: BusinessItem) => {
    switch (item.type) {
      case 'deal':
        navigate(`/deals/${item.id}`);
        break;
      case 'contract':
        navigate(`/contracts/${item.id}`);
        break;
      case 'lead':
        // Navigate to lead detail based on type (would need to determine if company or contact)
        break;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const formatCurrency = (amount: number | null, currency?: string) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deals, Contracts & Leads</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deal">Deals</SelectItem>
              <SelectItem value="contract">Contracts</SelectItem>
              <SelectItem value="lead">Leads</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No business items found for this site.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Next Action</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={`${item.type}-${item.id}`}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.type, item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(item.value, item.currency)}</TableCell>
                  <TableCell>{item.assignedTo || '-'}</TableCell>
                  <TableCell>
                    {item.nextAction && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <ArrowRight className="h-3 w-3" />
                        {item.nextAction}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemClick(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}