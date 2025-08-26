import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Handshake, DollarSign } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { EntityListing } from '@/components/entity-listing';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';

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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; deal: Deal | null }>({
    open: false,
    deal: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleEdit = (deal: Deal) => {
    navigate(`/deals/edit/${deal.id}`);
  };

  const handleDelete = (deal: Deal) => {
    setDeleteModal({ open: true, deal });
  };

  const confirmDelete = async () => {
    if (!deleteModal.deal) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', deleteModal.deal.id);

      if (error) throw error;

      await fetchDeals();
      toast({
        title: 'Success',
        description: 'Deal deleted successfully',
      });
      setDeleteModal({ open: false, deal: null });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDeals = deals.filter(deal =>
    deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.customers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <EntityListing
        title="Deals"
        description="Track and manage sales opportunities"
        icon={Handshake}
        entities={filteredDeals}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAdd={() => navigate('/add-deal')}
        addButtonText="Add Deal"
        getEntityCardProps={(deal) => ({
          id: deal.id,
          title: deal.name,
          icon: Handshake,
          badge: {
            text: deal.status,
            className: `text-white ${statusColors[deal.status]}`,
            variant: 'secondary',
          },
          fields: [
            ...(deal.value ? [{
              icon: DollarSign,
              value: `${deal.currencies?.symbol || '$'}${deal.value.toLocaleString()}${deal.probability > 0 ? ` (${deal.probability}%)` : ''}`,
              isSecondary: false,
            }] : []),
            ...(deal.customers ? [{
              label: 'Customer',
              value: deal.customers.name,
              isSecondary: true,
            }] : []),
            ...(deal.sites ? [{
              label: 'Site',
              value: deal.sites.name,
              isSecondary: true,
            }] : []),
            ...(deal.expected_close_date ? [{
              label: 'Expected close',
              value: new Date(deal.expected_close_date).toLocaleDateString(),
              isSecondary: true,
            }] : []),
            {
              value: `Created ${new Date(deal.created_at).toLocaleDateString()}`,
              isSecondary: true,
            },
          ],
        })}
        columns={[
          {
            key: 'name',
            label: 'Deal',
            render: (_, deal) => (
              <div className="space-y-1">
                <div className="font-medium">{deal.name}</div>
                <Badge 
                  className={`text-white ${statusColors[deal.status]}`}
                  variant="secondary"
                >
                  {deal.status}
                </Badge>
              </div>
            ),
          },
          {
            key: 'value',
            label: 'Value',
            render: (_, deal) => (
              deal.value ? (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">
                    {deal.currencies?.symbol || '$'}{deal.value.toLocaleString()}
                  </span>
                  {deal.probability > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ({deal.probability}%)
                    </span>
                  )}
                </div>
              ) : '-'
            ),
          },
          {
            key: 'customer',
            label: 'Customer',
            render: (_, deal) => deal.customers?.name || '-',
          },
          {
            key: 'expected_close_date',
            label: 'Expected Close',
            render: (value) => value ? new Date(value).toLocaleDateString() : '-',
          },
        ]}
        onEdit={handleEdit}
        onDelete={handleDelete}
        editPermission="deals.edit"
        deletePermission="deals.delete"
        emptyStateMessage="Start tracking sales opportunities by creating your first deal."
      />
      
      <DeleteConfirmationModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, deal: null })}
        onConfirm={confirmDelete}
        title="Delete Deal"
        description={`Are you sure you want to delete "${deleteModal.deal?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};

export default Deals;