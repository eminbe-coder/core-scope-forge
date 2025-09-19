import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { EntityListing } from '@/components/entity-listing';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';

interface Contact {
  id: string;
  tenant_id: string;
  customer_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  notes?: string;
  active: boolean;
  is_lead?: boolean;
  customers: {
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

const Contacts = () => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; contact: Contact | null }>({
    open: false,
    contact: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContacts = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          customers(name)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [currentTenant]);

  const toggleLeadStatus = async (contact: Contact) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_lead: !contact.is_lead })
        .eq('id', contact.id);

      if (error) throw error;

      await fetchContacts();
      toast({
        title: 'Success',
        description: `Contact ${!contact.is_lead ? 'marked as lead' : 'removed from leads'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    navigate(`/contacts/edit/${contact.id}`);
  };

  const handleView = (contact: Contact) => {
    navigate(`/contacts/${contact.id}`);
  };

  const handleDelete = (contact: Contact) => {
    setDeleteModal({ open: true, contact });
  };

  const confirmDelete = async () => {
    if (!deleteModal.contact || !currentTenant?.id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_entity', {
        _table_name: 'contacts',
        _entity_id: deleteModal.contact.id,
        _tenant_id: currentTenant.id
      });

      if (error) throw error;

      await fetchContacts();
      toast({
        title: 'Success',
        description: 'Contact moved to recycle bin',
      });
      setDeleteModal({ open: false, contact: null });
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

  const filteredContacts = contacts.filter(contact =>
    `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.customers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <EntityListing
        title="Contacts"
        description="Manage your business contacts"
        icon={User}
        entities={filteredContacts}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAdd={() => navigate('/contacts/add')}
        addButtonText="Add Contact"
        getEntityCardProps={(contact) => ({
          id: contact.id,
          title: `${contact.first_name} ${contact.last_name}`,
          icon: User,
          onClick: () => handleView(contact),
          fields: [
            ...(contact.position ? [{
              value: contact.position,
              isSecondary: true,
            }] : []),
            ...(contact.email ? [{
              icon: Mail,
              value: contact.email,
              isSecondary: true,
            }] : []),
            ...(contact.phone ? [{
              icon: Phone,
              value: contact.phone,
              isSecondary: true,
            }] : []),
            ...(contact.customers ? [{
              label: 'Company',
              value: contact.customers.name,
              isSecondary: true,
            }] : []),
            {
              value: `Added ${new Date(contact.created_at).toLocaleDateString()}`,
              isSecondary: true,
            },
          ],
        })}
        columns={[
          {
            key: 'name',
            label: 'Name',
            render: (_, contact) => (
              <div className="space-y-1">
                <div className="font-medium">{contact.first_name} {contact.last_name}</div>
                {contact.position && (
                  <div className="text-sm text-muted-foreground">
                    {contact.position}
                  </div>
                )}
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
            key: 'company',
            label: 'Company',
            render: (_, contact) => contact.customers?.name || '-',
          },
        ]}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleLead={toggleLeadStatus}
        editPermission="contacts.edit"
        deletePermission="contacts.delete"
        leadPermission="contacts.manage_leads"
        emptyStateMessage="Add contacts to keep track of important business relationships."
      />
      
      <DeleteConfirmationModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, contact: null })}
        onConfirm={confirmDelete}
        title="Delete Contact"
        description={`Are you sure you want to delete "${deleteModal.contact?.first_name} ${deleteModal.contact?.last_name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};

export default Contacts;