import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { EntityListing } from '@/components/entity-listing';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';

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
  is_lead?: boolean;
  customers: {
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

const Sites = () => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; site: Site | null }>({
    open: false,
    site: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSites = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('sites')
        .select(`
          *,
          customers(name)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .is('deleted_at', null)
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

  const toggleLeadStatus = async (site: Site) => {
    try {
      const { error } = await supabase
        .from('sites')
        .update({ is_lead: !site.is_lead })
        .eq('id', site.id);

      if (error) throw error;

      await fetchSites();
      toast({
        title: 'Success',
        description: `Site ${!site.is_lead ? 'marked as lead' : 'removed from leads'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (site: Site) => {
    navigate(`/sites/edit/${site.id}`);
  };

  const handleDelete = (site: Site) => {
    setDeleteModal({ open: true, site });
  };

  const confirmDelete = async () => {
    if (!deleteModal.site || !currentTenant?.id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_entity', {
        _table_name: 'sites',
        _entity_id: deleteModal.site.id,
        _tenant_id: currentTenant.id
      });

      if (error) throw error;

      await fetchSites();
      toast({
        title: 'Success',
        description: 'Site moved to recycle bin',
      });
      setDeleteModal({ open: false, site: null });
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

  const filteredSites = sites.filter(site =>
    site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    site.customers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <EntityListing
        title="Sites"
        description="Manage physical locations and sites"
        icon={MapPin}
        entities={filteredSites}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAdd={() => navigate('/add-site')}
        addButtonText="Add Site"
        getEntityCardProps={(site) => ({
          id: site.id,
          title: site.name,
          icon: MapPin,
          fields: [
            {
              value: site.address,
              isSecondary: false,
            },
            ...((site.city || site.state || site.country) ? [{
              value: [site.city, site.state, site.country].filter(Boolean).join(', '),
              isSecondary: true,
            }] : []),
            ...(site.customers ? [{
              label: 'Customer',
              value: site.customers.name,
              isSecondary: true,
            }] : []),
            {
              value: `Added ${new Date(site.created_at).toLocaleDateString()}`,
              isSecondary: true,
            },
          ],
          onClick: () => navigate(`/sites/${site.id}`),
        })}
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (_, site) => (
              <div className="space-y-1 cursor-pointer" onClick={() => navigate(`/sites/${site.id}`)}>
                <div className="font-medium hover:text-primary">{site.name}</div>
                <div className="text-sm text-muted-foreground">{site.address}</div>
              </div>
            ),
          },
          {
            key: 'location',
            label: 'Location',
            render: (_, site) => (
              [site.city, site.state, site.country].filter(Boolean).join(', ') || '-'
            ),
          },
          {
            key: 'customer',
            label: 'Customer',
            render: (_, site) => site.customers?.name || '-',
          },
        ]}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleLead={toggleLeadStatus}
        editPermission="sites.edit"
        deletePermission="sites.delete"
        leadPermission="sites.manage_leads"
        emptyStateMessage="Add physical locations and sites to track your projects and deals."
      />
      
      <DeleteConfirmationModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, site: null })}
        onConfirm={confirmDelete}
        title="Delete Site"
        description={`Are you sure you want to delete "${deleteModal.site?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};

export default Sites;