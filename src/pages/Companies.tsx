import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Globe, MapPin, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EntityListing } from '@/components/entity-listing';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';

interface Company {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  headquarters?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  notes?: string;
  active: boolean;
  is_lead?: boolean;
  created_at: string;
  updated_at: string;
}

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; company: Company | null }>({
    open: false,
    company: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const navigate = useNavigate();

  const fetchCompanies = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [currentTenant]);

  const toggleLeadStatus = async (company: Company) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_lead: !company.is_lead })
        .eq('id', company.id);

      if (error) throw error;

      await fetchCompanies();
      toast({
        title: 'Success',
        description: `Company ${!company.is_lead ? 'marked as lead' : 'removed from leads'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (company: Company) => {
    navigate(`/companies/edit/${company.id}`);
  };

  const handleDelete = (company: Company) => {
    setDeleteModal({ open: true, company });
  };

  const confirmDelete = async () => {
    if (!deleteModal.company) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', deleteModal.company.id);

      if (error) throw error;

      await fetchCompanies();
      toast({
        title: 'Success',
        description: 'Company deleted successfully',
      });
      setDeleteModal({ open: false, company: null });
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

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <EntityListing
        title="Companies"
        description="Manage your company relationships and partnerships"
        icon={Building}
        entities={filteredCompanies}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAdd={() => navigate('/companies/add')}
        addButtonText="Add Company"
        getEntityCardProps={(company) => ({
          id: company.id,
          title: company.name,
          icon: Building,
          badge: company.active ? undefined : {
            text: 'Inactive',
            variant: 'secondary' as const,
          },
          fields: [
            ...(company.description ? [{
              value: company.description,
              isSecondary: true,
            }] : []),
            ...(company.industry ? [{
              label: 'Industry',
              value: company.industry,
              isSecondary: true,
            }] : []),
            ...(company.size ? [{
              label: 'Size',
              value: company.size,
              isSecondary: true,
            }] : []),
            ...(company.website ? [{
              icon: Globe,
              value: company.website,
              isSecondary: true,
            }] : []),
            ...(company.headquarters ? [{
              icon: MapPin,
              value: company.headquarters,
              isSecondary: true,
            }] : []),
            ...(company.phone ? [{
              icon: Phone,
              value: company.phone,
              isSecondary: true,
            }] : []),
            ...(company.email ? [{
              icon: Mail,
              value: company.email,
              isSecondary: true,
            }] : []),
            {
              value: `Added ${new Date(company.created_at).toLocaleDateString()}`,
              isSecondary: true,
            },
          ],
        })}
        columns={[
          {
            key: 'name',
            label: 'Company',
            render: (_, company) => (
              <div className="space-y-1">
                <div className="font-medium">{company.name}</div>
                {company.description && (
                  <div className="text-sm text-muted-foreground">
                    {company.description}
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {company.website}
                    </a>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'industry',
            label: 'Industry',
            render: (value) => value || '-',
          },
          {
            key: 'size',
            label: 'Size',
            render: (value) => value || '-',
          },
          {
            key: 'contact',
            label: 'Contact',
            render: (_, company) => (
              <div className="space-y-1">
                {company.headquarters && (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3" />
                    {company.headquarters}
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3" />
                    {company.phone}
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-1 text-sm">
                    <Mail className="h-3 w-3" />
                    {company.email}
                  </div>
                )}
              </div>
            ),
          },
        ]}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleLead={toggleLeadStatus}
        editPermission="companies.edit"
        deletePermission="companies.delete"
        leadPermission="companies.manage_leads"
        emptyStateMessage="You haven't added any companies yet. Companies help you track your business relationships and partnerships."
      />
      
      <DeleteConfirmationModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, company: null })}
        onConfirm={confirmDelete}
        title="Delete Company"
        description={`Are you sure you want to delete "${deleteModal.company?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
}