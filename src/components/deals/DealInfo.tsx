import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { UnifiedEntitySelect } from '@/components/ui/unified-entity-select';
import { MultiSelectDropdown } from '@/components/deals/MultiSelectDropdown';
import { SolutionCategorySelect } from '@/components/ui/solution-category-select';
import { QuickAddSiteModal } from '@/components/modals/QuickAddSiteModal';
import { QuickAddCompanyModal } from '@/components/modals/QuickAddCompanyModal';
import { UnifiedQuickAddContactModal } from '@/components/modals/UnifiedQuickAddContactModal';
import { DollarSign, Calendar, Building, MapPin, Percent, Edit3, Save, X, Users, User, Plus, CheckSquare, Trash2, Tag } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';

interface DealStage {
  id: string;
  name: string;
  win_percentage: number;
}

interface DealStatus {
  id: string;
  name: string;
  description?: string;
}

interface Site {
  id: string;
  name: string;
  address: string;
}

interface Company {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface PaymentTerm {
  id?: string;
  installment_number: number;
  amount_type: 'fixed' | 'percentage';
  amount_value: number;
  calculated_amount?: number;
  due_date?: string;
  notes?: string;
}

interface DealNote {
  id?: string;
  content: string;
  created_at?: string;
  created_by?: string;
  author_name?: string;
}

interface Deal {
  id: string;
  name: string;
  description?: string;
  value?: number;
  status: string;
  stage_id?: string;
  deal_status_id?: string;
  site_id?: string;
  customer_id?: string;
  customer_reference_number?: string;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
  assigned_to?: string;
  solution_category_ids?: string[];
  customers?: {
    id: string;
    name: string;
  };
  sites?: {
    name: string;
  };
  currencies?: {
    symbol: string;
  };
  deal_stages?: {
    name: string;
    win_percentage: number;
  };
  assigned_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

interface DealInfoProps {
  deal: Deal;
  onUpdate: () => void;
}

export const DealInfo = ({ deal, onUpdate }: DealInfoProps) => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [stages, setStages] = useState<DealStage[]>([]);
  const [dealStatuses, setDealStatuses] = useState<DealStatus[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [linkedCompanies, setLinkedCompanies] = useState<Company[]>([]);
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([]);
  const [tenantUsers, setTenantUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [nextTodo, setNextTodo] = useState<{ title: string; due_date?: string } | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [dealNotes, setDealNotes] = useState<DealNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editedDeal, setEditedDeal] = useState({
    stage_id: deal.stage_id || '',
    deal_status_id: deal.deal_status_id || 'none',
    description: deal.description || '',
    value: deal.value || 0,
    expected_close_date: deal.expected_close_date || '',
    site_id: deal.site_id || 'no-site-selected',
    customer_id: deal.customer_id || '',
    customer_reference_number: deal.customer_reference_number || '',
    assigned_to: deal.assigned_to || 'unassigned',
    solution_category_ids: deal.solution_category_ids || [] as string[],
    company_ids: [] as string[],
    contact_ids: [] as string[],
  });

  const fetchStages = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('deal_stages')
        .select('id, name, win_percentage')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('sort_order');

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error fetching deal stages:', error);
    }
  };

  const fetchDealStatuses = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('deal_statuses')
        .select('id, name, description')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('sort_order');

      if (error) throw error;
      setDealStatuses(data || []);
    } catch (error) {
      console.error('Error fetching deal statuses:', error);
    }
  };

  const fetchSites = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, address')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchCompanies = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchCustomers = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchContacts = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('first_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchTenantUsers = async () => {
    if (!currentTenant) return;

    try {
        const { data, error } = await supabase
        .from('user_tenant_memberships')
        .select(`
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      if (error) throw error;
      
      const users = data?.map(membership => ({
        value: membership.profiles?.id || '',
        label: `${membership.profiles?.first_name} ${membership.profiles?.last_name}`,
        email: membership.profiles?.email || ''
      })).filter(user => user.value) || [];
      
      const tenantUsersList = users.map(user => ({
        id: user.value,
        name: user.label.trim() || user.email,
        email: user.email
      }));
      
      setTenantUsers(tenantUsersList);
    } catch (error) {
      console.error('Error fetching tenant users:', error);
    }
  };

  const fetchNextTodo = async () => {
    if (!deal.id) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('title, due_date')
        .eq('deal_id', deal.id)
        .eq('type', 'task')
        .eq('completed', false)
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      setNextTodo(data);
    } catch (error) {
      console.error('Error fetching next todo:', error);
      setNextTodo(null);
    }
  };

  const fetchPaymentTerms = async () => {
    if (!deal.id) return;

    try {
      const { data, error } = await supabase
        .from('deal_payment_terms')
        .select('*')
        .eq('deal_id', deal.id)
        .order('installment_number');

      if (error) throw error;
      const paymentTermsData = (data || []).map(term => ({
        ...term,
        amount_type: term.amount_type as 'fixed' | 'percentage'
      }));
      setPaymentTerms(paymentTermsData);
    } catch (error) {
      console.error('Error fetching payment terms:', error);
    }
  };

  const fetchDealNotes = async () => {
    if (!deal.id) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          description,
          created_at,
          created_by,
          profiles!activities_created_by_fkey(first_name, last_name)
        `)
        .eq('deal_id', deal.id)
        .eq('type', 'note')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const notes = data?.map(activity => ({
        id: activity.id,
        content: activity.description || '',
        created_at: activity.created_at,
        created_by: activity.created_by,
        author_name: activity.profiles ? 
          `${activity.profiles.first_name || ''} ${activity.profiles.last_name || ''}`.trim() : 
          'Unknown'
      })) || [];
      
      setDealNotes(notes);
    } catch (error) {
      console.error('Error fetching deal notes:', error);
    }
  };

  const fetchLinkedEntities = async () => {
    if (!deal.id) return;

    try {
      // Fetch linked companies
      const { data: companyData, error: companyError } = await supabase
        .from('deal_companies')
        .select(`
          companies(id, name)
        `)
        .eq('deal_id', deal.id);

      if (companyError) throw companyError;
      const linkedCompaniesData = companyData?.map(dc => dc.companies).filter(Boolean) || [];
      setLinkedCompanies(linkedCompaniesData as Company[]);

      // Fetch linked contacts
      const { data: contactData, error: contactError } = await supabase
        .from('deal_contacts')
        .select(`
          contacts(id, first_name, last_name, email)
        `)
        .eq('deal_id', deal.id);

      if (contactError) throw contactError;
      const linkedContactsData = contactData?.map(dc => dc.contacts).filter(Boolean) || [];
      setLinkedContacts(linkedContactsData as Contact[]);

      // Update edited deal with current linked IDs
      setEditedDeal(prev => ({
        ...prev,
        company_ids: linkedCompaniesData.map(c => c?.id || ''),
        contact_ids: linkedContactsData.map(c => c?.id || ''),
      }));
    } catch (error) {
      console.error('Error fetching linked entities:', error);
    }
  };

  useEffect(() => {
    fetchStages();
    fetchDealStatuses();
    fetchSites();
    fetchCompanies();
    fetchContacts();
    fetchCustomers();
    fetchTenantUsers();
    fetchLinkedEntities();
    fetchNextTodo();
    fetchPaymentTerms();
    fetchDealNotes();
  }, [currentTenant, deal.id]);

  const getCurrentStage = () => {
    return stages.find(stage => stage.id === deal.stage_id);
  };

  const handleCustomerEntitySelect = async (entityId: string, entity: any) => {
    if (entity.type === 'customer') {
      // Direct customer selection
      setEditedDeal(prev => ({ ...prev, customer_id: entityId }));
    } else if (entity.type === 'company' || entity.type === 'contact') {
      // Promote to customer first
      const newCustomerId = await promoteToCustomer(entity, entity.type);
      if (newCustomerId) {
        setEditedDeal(prev => ({ ...prev, customer_id: newCustomerId }));
        
        // Log the promotion activity
        const entityName = entity.type === 'company' ? entity.name : `${entity.first_name} ${entity.last_name}`;
        toast({
          title: 'Success',
          description: `${entity.type === 'company' ? 'Company' : 'Contact'} "${entityName}" has been promoted to customer`,
        });
      }
    }
  };

  const promoteToCustomer = async (entity: any, entityType: 'company' | 'contact'): Promise<string | null> => {
    try {
      let customerData: any = {
        tenant_id: currentTenant?.id,
        active: true,
      };

      if (entityType === 'company') {
        customerData = {
          ...customerData,
          name: entity.name,
          type: 'company',
          // Copy other relevant company fields if they exist
          email: entity.email || null,
          phone: entity.phone || null,
          website: entity.website || null,
          address: entity.headquarters || null,
          notes: `Promoted from company: ${entity.name}`,
        };
      } else if (entityType === 'contact') {
        customerData = {
          ...customerData,
          name: `${entity.first_name} ${entity.last_name}`.trim(),
          type: 'individual',
          email: entity.email || null,
          phone: entity.phone || null,
          address: entity.address || null,
          notes: `Promoted from contact: ${entity.first_name} ${entity.last_name}`,
        };
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select('id, name')
        .single();

      if (error) throw error;

      // Refresh customers list
      await fetchCustomers();
      
      return customer.id;
    } catch (error) {
      console.error('Error promoting to customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to promote to customer',
        variant: 'destructive',
      });
      return null;
    }
  };

  const logActivity = async (changes: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentTenant || changes.length === 0) return;

      await supabase
        .from('activities')
        .insert({
          tenant_id: currentTenant.id,
          deal_id: deal.id,
          type: 'note',
          title: 'Deal Updated',
          description: `Deal information updated: ${changes.join(', ')}`,
          created_by: user.id,
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    try {
      const changes: string[] = [];
      
      // Check what changed
      if (editedDeal.stage_id !== deal.stage_id) {
        const newStage = stages.find(s => s.id === editedDeal.stage_id);
        const oldStage = stages.find(stage => stage.id === deal.stage_id);
        changes.push(`Stage changed from "${oldStage?.name || 'None'}" to "${newStage?.name || 'None'}"`);
      }
      
      if (editedDeal.description !== deal.description) {
        changes.push(`Description updated`);
      }
      
      if (editedDeal.value !== deal.value) {
        changes.push(`Value changed from ${deal.currencies?.symbol || '$'}${deal.value?.toLocaleString() || 0} to ${deal.currencies?.symbol || '$'}${editedDeal.value.toLocaleString()}`);
      }
      
      if (editedDeal.expected_close_date !== deal.expected_close_date) {
        const oldDate = deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'Not set';
        const newDate = editedDeal.expected_close_date ? new Date(editedDeal.expected_close_date).toLocaleDateString() : 'Not set';
        changes.push(`Expected close date changed from ${oldDate} to ${newDate}`);
      }

      if ((editedDeal.site_id === 'no-site-selected' ? null : editedDeal.site_id) !== deal.site_id) {
        const oldSite = sites.find(s => s.id === deal.site_id);
        const newSite = editedDeal.site_id === 'no-site-selected' ? null : sites.find(s => s.id === editedDeal.site_id);
        changes.push(`Site changed from "${oldSite?.name || 'None'}" to "${newSite?.name || 'None'}"`);
      }

      if (editedDeal.customer_id !== deal.customer_id) {
        const oldCustomer = deal.customers;
        const newCustomer = customers.find(c => c.id === editedDeal.customer_id);
        changes.push(`Customer changed from "${oldCustomer?.name || 'None'}" to "${newCustomer?.name || 'None'}"`);
      }

      if (editedDeal.customer_reference_number !== deal.customer_reference_number) {
        changes.push(`Customer reference changed from "${deal.customer_reference_number || 'None'}" to "${editedDeal.customer_reference_number || 'None'}"`);
      }

      if (editedDeal.assigned_to !== deal.assigned_to) {
        const oldUser = deal.assigned_user;
        const newUser = tenantUsers.find(u => u.id === editedDeal.assigned_to);
        const oldName = oldUser ? `${oldUser.first_name} ${oldUser.last_name}`.trim() : 'None';
        const newName = newUser ? newUser.name : 'None';
        changes.push(`Salesperson changed from "${oldName}" to "${newName}"`);
      }

      // Check company changes
      const currentCompanyIds = linkedCompanies.map(c => c.id).sort();
      const newCompanyIds = editedDeal.company_ids.sort();
      if (JSON.stringify(currentCompanyIds) !== JSON.stringify(newCompanyIds)) {
        const addedCompanies = newCompanyIds.filter(id => !currentCompanyIds.includes(id));
        const removedCompanies = currentCompanyIds.filter(id => !newCompanyIds.includes(id));
        
        if (addedCompanies.length > 0) {
          const addedNames = addedCompanies.map(id => companies.find(c => c.id === id)?.name).filter(Boolean);
          changes.push(`Added companies: ${addedNames.join(', ')}`);
        }
        if (removedCompanies.length > 0) {
          const removedNames = removedCompanies.map(id => linkedCompanies.find(c => c.id === id)?.name).filter(Boolean);
          changes.push(`Removed companies: ${removedNames.join(', ')}`);
        }
      }

      // Check contact changes
      const currentContactIds = linkedContacts.map(c => c.id).sort();
      const newContactIds = editedDeal.contact_ids.sort();
      if (JSON.stringify(currentContactIds) !== JSON.stringify(newContactIds)) {
        const addedContacts = newContactIds.filter(id => !currentContactIds.includes(id));
        const removedContacts = currentContactIds.filter(id => !newContactIds.includes(id));
        
        if (addedContacts.length > 0) {
          const addedNames = addedContacts.map(id => {
            const contact = contacts.find(c => c.id === id);
            return contact ? `${contact.first_name} ${contact.last_name}` : '';
          }).filter(Boolean);
          changes.push(`Added contacts: ${addedNames.join(', ')}`);
        }
        if (removedContacts.length > 0) {
          const removedNames = removedContacts.map(id => {
            const contact = linkedContacts.find(c => c.id === id);
            return contact ? `${contact.first_name} ${contact.last_name}` : '';
          }).filter(Boolean);
          changes.push(`Removed contacts: ${removedNames.join(', ')}`);
        }
      }

      if (JSON.stringify(editedDeal.solution_category_ids) !== JSON.stringify(deal.solution_category_ids || [])) {
        changes.push('Solution categories updated');
      }

      if (editedDeal.deal_status_id !== deal.deal_status_id) {
        const statusName = editedDeal.deal_status_id === 'none' ? 'None' : dealStatuses.find(s => s.id === editedDeal.deal_status_id)?.name || 'None';
        const oldStatusName = deal.deal_status_id ? dealStatuses.find(s => s.id === deal.deal_status_id)?.name || 'None' : 'None';
        changes.push(`Status changed from "${oldStatusName}" to "${statusName}"`);
      }

      // Update deal
      const { error } = await supabase
        .from('deals')
        .update({
          stage_id: editedDeal.stage_id || null,
          deal_status_id: editedDeal.deal_status_id === 'none' ? null : editedDeal.deal_status_id,
          description: editedDeal.description || null,
          value: editedDeal.value,
          expected_close_date: editedDeal.expected_close_date || null,
          site_id: editedDeal.site_id === 'no-site-selected' ? null : editedDeal.site_id || null,
          customer_id: editedDeal.customer_id || null,
          customer_reference_number: editedDeal.customer_reference_number || null,
          assigned_to: editedDeal.assigned_to === 'unassigned' ? null : editedDeal.assigned_to || null,
          solution_category_ids: editedDeal.solution_category_ids,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deal.id);

      if (error) throw error;

      // Update company relationships
      await supabase.from('deal_companies').delete().eq('deal_id', deal.id);
      
      if (editedDeal.company_ids.length > 0) {
        const companyInserts = editedDeal.company_ids.map(companyId => ({
          deal_id: deal.id,
          company_id: companyId,
        }));
        await supabase.from('deal_companies').insert(companyInserts);
      }

      // Update contact relationships
      await supabase.from('deal_contacts').delete().eq('deal_id', deal.id);
      
      if (editedDeal.contact_ids.length > 0) {
        const contactInserts = editedDeal.contact_ids.map(contactId => ({
          deal_id: deal.id,
          contact_id: contactId,
        }));
        await supabase.from('deal_contacts').insert(contactInserts);
      }

      // Log activity if there were changes
      if (changes.length > 0) {
        await logActivity(changes);
      }

      toast({
        title: 'Success',
        description: 'Deal updated successfully',
      });

      setEditMode(false);
      onUpdate();
      fetchLinkedEntities(); // Refresh the linked entities display
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setEditedDeal({
      stage_id: deal.stage_id || '',
      deal_status_id: deal.deal_status_id || 'none',
      description: deal.description || '',
      value: deal.value || 0,
      expected_close_date: deal.expected_close_date || '',
      site_id: deal.site_id || 'no-site-selected',
      customer_id: deal.customer_id || '',
      customer_reference_number: deal.customer_reference_number || '',
      assigned_to: deal.assigned_to || 'unassigned',
      solution_category_ids: deal.solution_category_ids || [] as string[],
      company_ids: linkedCompanies.map(c => c.id),
      contact_ids: linkedContacts.map(c => c.id),
    });
    setEditMode(false);
  };

  const addPaymentTerm = () => {
    const newTerm: PaymentTerm = {
      installment_number: paymentTerms.length + 1,
      amount_type: 'percentage',
      amount_value: 0,
      due_date: '',
      notes: '',
    };
    setPaymentTerms([...paymentTerms, newTerm]);
  };

  const updatePaymentTerm = (index: number, field: keyof PaymentTerm, value: any) => {
    const updatedTerms = [...paymentTerms];
    updatedTerms[index] = { ...updatedTerms[index], [field]: value };
    
    // Recalculate amounts
    if (field === 'amount_value' || field === 'amount_type') {
      updatedTerms[index].calculated_amount = 
        updatedTerms[index].amount_type === 'percentage' 
          ? (deal.value || 0) * updatedTerms[index].amount_value / 100
          : updatedTerms[index].amount_value;
    }
    
    setPaymentTerms(updatedTerms);
  };

  const removePaymentTerm = (index: number) => {
    const updatedTerms = paymentTerms.filter((_, i) => i !== index);
    // Renumber installments
    updatedTerms.forEach((term, i) => {
      term.installment_number = i + 1;
    });
    setPaymentTerms(updatedTerms);
  };

  const savePaymentTerms = async () => {
    if (!currentTenant) return;

    try {
      // Delete existing payment terms
      await supabase
        .from('deal_payment_terms')
        .delete()
        .eq('deal_id', deal.id);

      // Insert new payment terms
      if (paymentTerms.length > 0) {
        const termsData = paymentTerms.map(term => ({
          deal_id: deal.id,
          tenant_id: currentTenant.id,
          installment_number: term.installment_number,
          amount_type: term.amount_type,
          amount_value: term.amount_value,
          calculated_amount: term.calculated_amount,
          due_date: term.due_date || null,
          notes: term.notes || null,
        }));

        const { error } = await supabase
          .from('deal_payment_terms')
          .insert(termsData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Payment terms updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !currentTenant) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('activities')
        .insert({
          tenant_id: currentTenant.id,
          deal_id: deal.id,
          type: 'note',
          title: 'Deal Note',
          description: newNote.trim(),
          created_by: user.user.id,
        });

      if (error) throw error;

      setNewNote('');
      await fetchDealNotes();
      
      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      await fetchDealNotes();
      
      toast({
        title: 'Success',
        description: 'Note deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const currentStage = stages.find(stage => stage.id === deal.stage_id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Deal Details</CardTitle>
              <CardDescription>Basic information about this deal</CardDescription>
            </div>
            {!editMode ? (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* Stage */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Stage</span>
              {editMode ? (
                <Select
                  value={editedDeal.stage_id}
                  onValueChange={(value) => setEditedDeal(prev => ({ ...prev, stage_id: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className="bg-blue-500 text-white">
                  {currentStage?.name || deal.status}
                </Badge>
              )}
            </div>
            
            {/* Value */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Value
              </span>
              {editMode ? (
                <Input
                  type="number"
                  value={editedDeal.value}
                  onChange={(e) => setEditedDeal(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  className="w-40"
                />
              ) : (
                <span className="font-semibold">
                  {deal.currencies?.symbol || '$'}{deal.value?.toLocaleString() || '0'}
                </span>
              )}
            </div>
            
            {/* Probability */}
            {currentStage?.win_percentage !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Probability
                </span>
                <span>{currentStage.win_percentage}%</span>
              </div>
            )}
            
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Status
              </span>
              {editMode ? (
                <Select
                  value={editedDeal.deal_status_id}
                  onValueChange={(value) => setEditedDeal(prev => ({ ...prev, deal_status_id: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No status</SelectItem>
                    {dealStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm">
                  {dealStatuses.find(s => s.id === deal.deal_status_id)?.name || 'Not set'}
                </span>
              )}
            </div>
            
            {/* Expected Close Date */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expected Close
              </span>
              {editMode ? (
                <Input
                  type="date"
                  value={editedDeal.expected_close_date}
                  onChange={(e) => setEditedDeal(prev => ({ ...prev, expected_close_date: e.target.value }))}
                  className="w-40"
                />
              ) : (
                <span>{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'Not set'}</span>
              )}
            </div>

            {/* Salesperson */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Salesperson
              </span>
              {editMode ? (
                <Select
                  value={editedDeal.assigned_to}
                  onValueChange={(value) => setEditedDeal(prev => ({ ...prev, assigned_to: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">No Assignment</SelectItem>
                    {tenantUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span>
                  {deal.assigned_user ? 
                    `${deal.assigned_user.first_name} ${deal.assigned_user.last_name}`.trim() : 
                    'Not assigned'
                  }
                </span>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Description</span>
              {editMode ? (
                <Textarea
                  value={editedDeal.description}
                  onChange={(e) => setEditedDeal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Deal description..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {deal.description || 'No description'}
                </p>
              )}
            </div>

            {/* Solution Categories */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Solution Categories</span>
              {editMode ? (
                <SolutionCategorySelect
                  value={editedDeal.solution_category_ids}
                  onChange={(value) => setEditedDeal(prev => ({ ...prev, solution_category_ids: value }))}
                  placeholder="Select solution categories..."
                />
              ) : (
                <div className="flex flex-wrap gap-1">
                  {deal.solution_category_ids && deal.solution_category_ids.length > 0 ? (
                    deal.solution_category_ids.map((categoryId) => (
                      <Badge key={categoryId} variant="secondary" className="text-xs">
                        Category {categoryId.slice(-4)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No categories selected</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Terms / Installments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Instalment Terms
              </CardTitle>
              <CardDescription>Manage installments and payment schedule</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addPaymentTerm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Term
              </Button>
              {paymentTerms.length > 0 && (
                <Button size="sm" onClick={savePaymentTerms}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Terms
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentTerms.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No instalment terms defined. Click "Add Term" to create installments.
            </p>
          ) : (
            <div className="space-y-4">
              {paymentTerms.map((term, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Installment #{term.installment_number}</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removePaymentTerm(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Amount Type</Label>
                      <Select
                        value={term.amount_type}
                        onValueChange={(value: 'fixed' | 'percentage') => 
                          updatePaymentTerm(index, 'amount_type', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-sm">
                        {term.amount_type === 'percentage' ? 'Percentage (%)' : 'Amount'}
                      </Label>
                      <Input
                        type="number"
                        value={term.amount_value}
                        onChange={(e) => updatePaymentTerm(index, 'amount_value', parseFloat(e.target.value) || 0)}
                        placeholder={term.amount_type === 'percentage' ? '0' : '0.00'}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Due Date</Label>
                      <Input
                        type="date"
                        value={term.due_date || ''}
                        onChange={(e) => updatePaymentTerm(index, 'due_date', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm">Calculated Amount</Label>
                      <Input
                        value={`${deal.currencies?.symbol || '$'}${(term.calculated_amount || 0).toLocaleString()}`}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Notes</Label>
                    <Input
                      value={term.notes || ''}
                      onChange={(e) => updatePaymentTerm(index, 'notes', e.target.value)}
                      placeholder="Optional notes for this installment..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Step Card */}
      {nextTodo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Next Step
                </CardTitle>
                <CardDescription>Upcoming task for this deal</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">{nextTodo.title}</div>
              {nextTodo.due_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Due: {new Date(nextTodo.due_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Related Information</CardTitle>
              <CardDescription>Customer, site, companies, and contact details</CardDescription>
            </div>
            {!editMode && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Relations
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customer */}
          {editMode ? (
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Customer
              </span>
              <UnifiedEntitySelect
                value={editedDeal.customer_id}
                onValueChange={handleCustomerEntitySelect}
                customers={customers.map(c => ({ ...c, type: 'customer' as const }))}
                companies={companies.map(c => ({ ...c, type: 'company' as const }))}
                contacts={contacts.map(c => ({ ...c, type: 'contact' as const }))}
                placeholder="Select customer, company, or contact..."
                searchPlaceholder="Search customers, companies, contacts..."
                emptyText="No entities found."
              />
              <p className="text-xs text-muted-foreground">
                Companies and contacts will be automatically promoted to customers when selected.
              </p>
            </div>
          ) : deal.customers && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Customer
              </span>
              <span>{deal.customers.name}</span>
            </div>
          )}

          {/* Customer Reference Number */}
          {editMode ? (
            <div className="space-y-2">
              <span className="text-sm font-medium">Customer Reference</span>
              <Input
                value={editedDeal.customer_reference_number}
                onChange={(e) => setEditedDeal(prev => ({ ...prev, customer_reference_number: e.target.value }))}
                placeholder="Enter customer reference number"
              />
            </div>
          ) : deal.customer_reference_number && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Customer Reference</span>
              <span>{deal.customer_reference_number}</span>
            </div>
          )}

          {/* Site */}
          {editMode ? (
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Site
              </span>
              <div className="flex gap-2">
                <Select
                  value={editedDeal.site_id}
                  onValueChange={(value) => setEditedDeal(prev => ({ ...prev, site_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border">
                    <SelectItem value="no-site-selected">No Site</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name} - {site.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSiteModal(true)}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              {deal.sites ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Site
                  </span>
                  <span>{deal.sites.name}</span>
                </div>
              ) : sites.find(s => s.id === deal.site_id) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Site
                  </span>
                  <span>{sites.find(s => s.id === deal.site_id)?.name}</span>
                </div>
              )}
            </>
          )}

          {/* Companies */}
          {editMode ? (
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Companies
              </span>
              <div className="flex gap-2">
                <div className="flex-1">
                  <MultiSelectDropdown
                    options={companies.map(c => ({ id: c.id, name: c.name }))}
                    selected={editedDeal.company_ids}
                    onSelectionChange={(values) => setEditedDeal(prev => ({ ...prev, company_ids: values }))}
                    placeholder="Select companies..."
                    searchPlaceholder="Search companies..."
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompanyModal(true)}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : linkedCompanies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-4 w-4" />
                <span className="text-sm font-medium">Companies</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {linkedCompanies.map((company) => (
                  <Badge key={company.id} variant="secondary">
                    {company.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          {editMode ? (
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Contacts
              </span>
              <div className="flex gap-2">
                <div className="flex-1">
                  <MultiSelectDropdown
                    options={contacts.map(c => ({ 
                      id: c.id, 
                      name: `${c.first_name} ${c.last_name}${c.email ? ` (${c.email})` : ''}` 
                    }))}
                    selected={editedDeal.contact_ids}
                    onSelectionChange={(values) => setEditedDeal(prev => ({ ...prev, contact_ids: values }))}
                    placeholder="Select contacts..."
                    searchPlaceholder="Search contacts..."
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContactModal(true)}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : linkedContacts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Contacts</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {linkedContacts.map((contact) => (
                  <Badge key={contact.id} variant="secondary">
                    {contact.first_name} {contact.last_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Customer (existing) - remove this section since we moved it above */}
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created
            </span>
            <span>{new Date(deal.created_at).toLocaleDateString()}</span>
          </div>

          {editMode && (
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Relations
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Add and manage deal notes</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new note */}
          <div className="flex gap-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a new note..."
              rows={3}
              className="flex-1"
            />
            <Button onClick={addNote} disabled={!newNote.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>

          {/* Existing notes */}
          <div className="space-y-3">
            {dealNotes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{note.author_name}</span>
                      <span>•</span>
                      <span>{note.created_at ? new Date(note.created_at).toLocaleString() : ''}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => note.id && deleteNote(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {dealNotes.length === 0 && (
              <p className="text-center py-8 text-muted-foreground">
                No notes yet. Add the first note above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Modals */}
      <QuickAddSiteModal
        open={showSiteModal}
        onClose={() => setShowSiteModal(false)}
        onSiteCreated={() => {
          fetchSites();
        }}
      />
      
      <QuickAddCompanyModal
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onCompanyCreated={() => {
          fetchCompanies();
        }}
      />
      
      <UnifiedQuickAddContactModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        onContactCreated={() => {
          fetchContacts();
        }}
      />
    </div>
  );
};