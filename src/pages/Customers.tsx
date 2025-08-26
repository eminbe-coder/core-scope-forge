import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Building2, User } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { EntityListing } from '@/components/entity-listing';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';

interface Customer {
  id: string;
  tenant_id: string;
  type: 'individual' | 'company';
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  website?: string;
  notes?: string;
  currency_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const Customers = () => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; customer: Customer | null }>({
    open: false,
    customer: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentTenant]);

  const handleEdit = (customer: Customer) => {
    navigate(`/customers/edit/${customer.id}`);
  };

  const handleDelete = (customer: Customer) => {
    setDeleteModal({ open: true, customer });
  };

  const confirmDelete = async () => {
    if (!deleteModal.customer) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteModal.customer.id);

      if (error) throw error;

      await fetchCustomers();
      toast({
        title: 'Success',
        description: 'Customer deleted successfully',
      });
      setDeleteModal({ open: false, customer: null });
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

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <EntityListing
        title="Customers"
        description="Manage your customers and companies"
        icon={Building2}
        entities={filteredCustomers}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAdd={() => navigate('/add-customer')}
        addButtonText="Add Customer"
        getEntityCardProps={(customer) => ({
          id: customer.id,
          title: customer.name,
          icon: customer.type === 'company' ? Building2 : User,
          badge: {
            text: customer.type,
            variant: customer.type === 'company' ? 'default' : 'secondary',
          },
          fields: [
            ...(customer.email ? [{
              value: customer.email,
              isSecondary: true,
            }] : []),
            ...(customer.phone ? [{
              value: customer.phone,
              isSecondary: true,
            }] : []),
            ...(customer.city ? [{
              value: customer.city,
              isSecondary: true,
            }] : []),
            {
              value: `Added ${new Date(customer.created_at).toLocaleDateString()}`,
              isSecondary: true,
            },
          ],
        })}
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (_, customer) => (
              <div className="flex items-center gap-2">
                {customer.type === 'company' ? (
                  <Building2 className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-primary" />
                )}
                <div className="space-y-1">
                  <div className="font-medium">{customer.name}</div>
                  <Badge variant={customer.type === 'company' ? 'default' : 'secondary'}>
                    {customer.type}
                  </Badge>
                </div>
              </div>
            ),
          },
          {
            key: 'email',
            label: 'Email',
            render: (value) => value || '-',
          },
          {
            key: 'phone',
            label: 'Phone',
            render: (value) => value || '-',
          },
          {
            key: 'location',
            label: 'Location',
            render: (_, customer) => customer.city || '-',
          },
        ]}
        onEdit={handleEdit}
        onDelete={handleDelete}
        editPermission="customers.edit"
        deletePermission="customers.delete"
        emptyStateMessage="Get started by adding your first customer to begin managing your CRM."
      />
      
      <DeleteConfirmationModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, customer: null })}
        onConfirm={confirmDelete}
        title="Delete Customer"
        description={`Are you sure you want to delete "${deleteModal.customer?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};

export default Customers;