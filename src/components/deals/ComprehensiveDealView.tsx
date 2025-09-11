import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  Calendar, 
  Building, 
  MapPin, 
  Users, 
  User, 
  Plus, 
  CheckSquare, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  FileText, 
  Upload,
  Folder,
  ExternalLink,
  Activity
} from 'lucide-react';
import { QuickAddCompanyModal } from '@/components/modals/QuickAddCompanyModal';
import { UnifiedQuickAddContactModal } from '@/components/modals/UnifiedQuickAddContactModal';
import { QuickAddSiteModal } from '@/components/modals/QuickAddSiteModal';
import { DealTodos } from './DealTodos';
import { EntityRelationships } from '@/components/entity-relationships/EntityRelationships';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Deal {
  id: string;
  name: string;
  description?: string;
  value?: number;
  status: string;
  stage_id?: string;
  site_id?: string;
  customer_id?: string;
  currency_id?: string;
  customer_reference_number?: string;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
  assigned_to?: string;
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

interface DealStage {
  id: string;
  name: string;
  win_percentage: number;
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

interface Company {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface Site {
  id: string;
  name: string;
  address: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  title?: string;
  description?: string;
  type: string;
  due_date?: string;
  completed?: boolean;
  created_at: string;
  created_by: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface OneDriveSettings {
  enabled: boolean;
  folder_structure: {
    deals: string;
    sites: string;
    customers: string;
  };
}

interface OneDriveSettingsRaw {
  enabled: boolean;
  folder_structure: any;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

interface ComprehensiveDealViewProps {
  deal: Deal;
  onUpdate: () => void;
}

interface DealTodosRef {
  refresh: () => void;
}

export interface ComprehensiveDealViewRef {
  refreshTodos: () => void;
}

export const ComprehensiveDealView = forwardRef<ComprehensiveDealViewRef, ComprehensiveDealViewProps>(({ deal, onUpdate }, ref) => {
  const dealTodosRef = useRef<DealTodosRef>(null);
  useImperativeHandle(ref, () => ({
    refreshTodos: () => dealTodosRef.current?.refresh(),
  }));
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State for all data
  const [stages, setStages] = useState<DealStage[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);
  const [linkedCompanies, setLinkedCompanies] = useState<Company[]>([]);
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([]);
  const [tenantUsers, setTenantUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todos, setTodos] = useState<Activity[]>([]);
  const [nextTodo, setNextTodo] = useState<{ title: string; due_date?: string } | null>(null);
  const [oneDriveSettings, setOneDriveSettings] = useState<OneDriveSettings | null>(null);
  const [dealFolderPath, setDealFolderPath] = useState<string>('');
  
  // UI state
  const [editMode, setEditMode] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingPaymentTerms, setEditingPaymentTerms] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [newNote, setNewNote] = useState('');
  const [customFolderPath, setCustomFolderPath] = useState('');
  
  const [editedDeal, setEditedDeal] = useState({
    stage_id: deal.stage_id || '',
    description: deal.description || '',
    value: deal.value || 0,
    expected_close_date: deal.expected_close_date || '',
    site_id: deal.site_id || 'no-site-selected',
    customer_id: deal.customer_id || '',
    currency_id: deal.currency_id || currentTenant?.default_currency_id || '',
    customer_reference_number: deal.customer_reference_number || '',
    assigned_to: deal.assigned_to || 'unassigned',
    company_ids: [] as string[],
    contact_ids: [] as string[],
  });

  // Fetch all data
  const fetchAllData = async () => {
    if (!currentTenant || !deal.id) return;

    try {
      await Promise.all([
        fetchStages(),
        fetchSites(),
        fetchCompanies(),
        fetchContacts(),
        fetchCustomers(),
        fetchCurrencies(),
        fetchTenantUsers(),
        fetchLinkedEntities(),
        fetchPaymentTerms(),
        fetchActivities(),
        fetchTodos(),
        fetchNextTodo(),
        fetchOneDriveSettings(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchStages = async () => {
    const { data, error } = await supabase
      .from('deal_stages')
      .select('id, name, win_percentage')
      .eq('tenant_id', currentTenant!.id)
      .eq('active', true)
      .order('sort_order');

    if (error) throw error;
    setStages(data || []);
  };

  const fetchSites = async () => {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name, address')
      .eq('tenant_id', currentTenant!.id)
      .eq('active', true)
      .order('name');

    if (error) throw error;
    setSites(data || []);
  };

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .eq('tenant_id', currentTenant!.id)
      .eq('active', true)
      .order('name');

    if (error) throw error;
    setCompanies(data || []);
  };
  
  const fetchCurrencies = async () => {
    const { data, error } = await supabase
      .from('currencies')
      .select('id, code, name, symbol')
      .eq('active', true)
      .order('code');

    if (error) throw error;
    setAvailableCurrencies(data || []);
  };

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('tenant_id', currentTenant!.id)
      .eq('active', true)
      .order('first_name');

    if (error) throw error;
    setContacts(data || []);
  };
  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .eq('tenant_id', currentTenant!.id)
      .eq('active', true)
      .order('name');

    if (error) throw error;
    setCustomers(data || []);
  };

  const fetchTenantUsers = async () => {
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
      .eq('tenant_id', currentTenant!.id)
      .eq('active', true);

    if (error) throw error;
    
    const users = data?.map(membership => ({
      id: membership.profiles?.id || '',
      name: `${membership.profiles?.first_name || ''} ${membership.profiles?.last_name || ''}`.trim() || membership.profiles?.email || '',
      email: membership.profiles?.email || '',
    })).filter(user => user.id) || [];
    
    setTenantUsers(users);
  };

  const fetchLinkedEntities = async () => {
    // Fetch linked companies
    const { data: companyData, error: companyError } = await supabase
      .from('deal_companies')
      .select('companies(id, name)')
      .eq('deal_id', deal.id);

    if (companyError) throw companyError;
    const linkedCompaniesData = companyData?.map(dc => dc.companies).filter(Boolean) || [];
    setLinkedCompanies(linkedCompaniesData as Company[]);

    // Fetch linked contacts
    const { data: contactData, error: contactError } = await supabase
      .from('deal_contacts')
      .select('contacts(id, first_name, last_name, email)')
      .eq('deal_id', deal.id);

    if (contactError) throw contactError;
    const linkedContactsData = contactData?.map(dc => dc.contacts).filter(Boolean) || [];
    setLinkedContacts(linkedContactsData as Contact[]);

    setEditedDeal(prev => ({
      ...prev,
      company_ids: linkedCompaniesData.map(c => c?.id || ''),
      contact_ids: linkedContactsData.map(c => c?.id || ''),
    }));
  };

  const fetchPaymentTerms = async () => {
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
  };

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        id,
        title,
        description,
        type,
        due_date,
        completed,
        created_at,
        created_by,
        profiles!activities_created_by_fkey(first_name, last_name)
      `)
      .eq('deal_id', deal.id)
      .in('type', ['note', 'call', 'email', 'meeting'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    setActivities(data || []);
  };

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        id,
        title,
        description,
        type,
        due_date,
        completed,
        created_at,
        created_by,
        profiles!activities_created_by_fkey(first_name, last_name)
      `)
      .eq('deal_id', deal.id)
      .eq('type', 'task')
      .eq('completed', false)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) throw error;
    setTodos(data || []);
  };

  const fetchNextTodo = async () => {
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

    if (error && error.code !== 'PGRST116') throw error;
    setNextTodo(data);
  };

  const fetchOneDriveSettings = async () => {
    const { data, error } = await supabase
      .from('tenant_onedrive_settings')
      .select('enabled, folder_structure')
      .eq('tenant_id', currentTenant!.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching OneDrive settings:', error);
      return;
    }

    if (data) {
      // Type guard and parse the folder_structure JSON
      let folderStructure = { deals: '', sites: '', customers: '' };
      
      if (data.folder_structure && typeof data.folder_structure === 'object') {
        folderStructure = {
          deals: (data.folder_structure as any)?.deals || '',
          sites: (data.folder_structure as any)?.sites || '',
          customers: (data.folder_structure as any)?.customers || '',
        };
      }

      const oneDriveSettings: OneDriveSettings = {
        enabled: data.enabled,
        folder_structure: folderStructure,
      };

      setOneDriveSettings(oneDriveSettings);
      
      // Generate deal folder path
      const customerName = deal.customers?.name || 'Unknown Customer';
      const dealName = deal.name;
      const folderPath = `${folderStructure.deals}/${customerName}/${dealName}`;
      setDealFolderPath(folderPath);
      setCustomFolderPath(folderPath);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [currentTenant, deal.id]);

  const getCurrentStage = () => {
    return stages.find(stage => stage.id === deal.stage_id);
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    try {
      const changes: string[] = [];
      
      // Check what changed and build update object
      const updateData: any = {};
      
      if (editedDeal.stage_id !== deal.stage_id) {
        const newStage = stages.find(s => s.id === editedDeal.stage_id);
        const oldStage = stages.find(s => s.id === deal.stage_id);
        
        updateData.stage_id = editedDeal.stage_id;
        // Auto-update probability based on stage
        if (newStage) {
          updateData.probability = newStage.win_percentage;
        }
        changes.push(`Stage changed to "${newStage?.name || 'None'}"`);
      }
      
      if (editedDeal.description !== deal.description) {
        updateData.description = editedDeal.description;
        changes.push('Description updated');
      }
      
      if (editedDeal.value !== deal.value) {
        updateData.value = editedDeal.value;
        changes.push('Value updated');
      }
      
      if (editedDeal.expected_close_date !== deal.expected_close_date) {
        updateData.expected_close_date = editedDeal.expected_close_date || null;
        changes.push('Expected close date updated');
      }
      
      if (editedDeal.site_id !== deal.site_id) {
        updateData.site_id = editedDeal.site_id === 'no-site-selected' ? null : editedDeal.site_id;
        changes.push('Site updated');
      }
      
      if (editedDeal.customer_id !== deal.customer_id) {
        updateData.customer_id = editedDeal.customer_id;
        changes.push('Customer updated');
      }
      
      if (editedDeal.customer_reference_number !== deal.customer_reference_number) {
        updateData.customer_reference_number = editedDeal.customer_reference_number;
        changes.push('Customer reference updated');
      }
      
      if (editedDeal.currency_id !== deal.currency_id) {
        updateData.currency_id = editedDeal.currency_id || null;
        const currencyName = availableCurrencies.find(c => c.id === editedDeal.currency_id)?.name || 'Default';
        changes.push(`Currency updated to ${currencyName}`);
      }
      
      if (editedDeal.assigned_to !== deal.assigned_to) {
        updateData.assigned_to = editedDeal.assigned_to === 'unassigned' ? null : editedDeal.assigned_to;
        changes.push('Salesperson updated');
      }

      // Update deal if there are changes
      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('deals')
          .update(updateData)
          .eq('id', deal.id);

        if (error) throw error;
      }

      // Handle linked companies and contacts
      await updateLinkedEntities();

      // Log activity if there are changes
      if (changes.length > 0) {
        await logActivity(changes);
      }

      setEditMode(false);
      onUpdate();
      fetchLinkedEntities();
      fetchPaymentTerms();
      dealTodosRef.current?.refresh();
      
      toast({
        title: 'Success',
        description: 'Deal updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating deal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update deal',
        variant: 'destructive',
      });
    }
  };

  const updateLinkedEntities = async () => {
    // Update companies
    const currentCompanyIds = linkedCompanies.map(c => c.id);
    const newCompanyIds = editedDeal.company_ids;
    
    const companiesToRemove = currentCompanyIds.filter(id => !newCompanyIds.includes(id));
    const companiesToAdd = newCompanyIds.filter(id => !currentCompanyIds.includes(id));
    
    if (companiesToRemove.length > 0) {
      await supabase
        .from('deal_companies')
        .delete()
        .eq('deal_id', deal.id)
        .in('company_id', companiesToRemove);
    }
    
    if (companiesToAdd.length > 0) {
      const companyInserts = companiesToAdd.map(companyId => ({
        deal_id: deal.id,
        company_id: companyId,
      }));
      await supabase.from('deal_companies').insert(companyInserts);
    }

    // Update contacts
    const currentContactIds = linkedContacts.map(c => c.id);
    const newContactIds = editedDeal.contact_ids;
    
    const contactsToRemove = currentContactIds.filter(id => !newContactIds.includes(id));
    const contactsToAdd = newContactIds.filter(id => !currentContactIds.includes(id));
    
    if (contactsToRemove.length > 0) {
      await supabase
        .from('deal_contacts')
        .delete()
        .eq('deal_id', deal.id)
        .in('contact_id', contactsToRemove);
    }
    
    if (contactsToAdd.length > 0) {
      const contactInserts = contactsToAdd.map(contactId => ({
        deal_id: deal.id,
        contact_id: contactId,
      }));
      await supabase.from('deal_contacts').insert(contactInserts);
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

  const addNote = async () => {
    if (!newNote.trim() || !currentTenant) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('activities')
        .insert({
          tenant_id: currentTenant.id,
          deal_id: deal.id,
          type: 'note',
          title: 'Note',
          description: newNote,
          created_by: user.id,
        });

      setNewNote('');
      await fetchActivities();
      await fetchTodos(); // Refresh todos in case the note was related to a task
      
      toast({
        title: 'Success',
        description: 'Note added successfully',
      });
    } catch (error: any) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note',
        variant: 'destructive',
      });
    }
  };

  const handleOpenFolder = () => {
    if (oneDriveSettings?.enabled && dealFolderPath) {
      // This would open the OneDrive folder in a new tab
      // For now, we'll show a modal with the folder path
      setShowFolderModal(true);
    } else {
      toast({
        title: 'OneDrive Not Configured',
        description: 'Please configure OneDrive integration in settings',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    const symbol = deal.currencies?.symbol || '$';
    return `${symbol}${value.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Quick add handlers
  const handleCompanyCreated = (newCompany: { id: string; name: string }) => {
    setLinkedCompanies(prev => [...prev, newCompany]);
    setEditedDeal(prev => ({ ...prev, company_ids: [...prev.company_ids, newCompany.id] }));
    fetchCompanies(); // Refresh full list
  };

  const handleContactCreated = (newContact: { id: string; first_name: string; last_name: string; email?: string }) => {
    setLinkedContacts(prev => [...prev, newContact]);
    setEditedDeal(prev => ({ ...prev, contact_ids: [...prev.contact_ids, newContact.id] }));
    fetchContacts(); // Refresh full list
  };

  const handleSiteCreated = (newSite: { id: string; name: string }) => {
    setEditedDeal(prev => ({ ...prev, site_id: newSite.id }));
    fetchSites(); // Refresh full list
  };

  const handleUnlinkCompany = async (companyId: string) => {
    try {
      await supabase
        .from('deal_companies')
        .delete()
        .eq('deal_id', deal.id)
        .eq('company_id', companyId);

      setLinkedCompanies(prev => prev.filter(c => c.id !== companyId));
      setEditedDeal(prev => ({ ...prev, company_ids: prev.company_ids.filter(id => id !== companyId) }));
      toast({ title: 'Success', description: 'Company unlinked' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleUnlinkContact = async (contactId: string) => {
    try {
      await supabase
        .from('deal_contacts')
        .delete()
        .eq('deal_id', deal.id)
        .eq('contact_id', contactId);

      setLinkedContacts(prev => prev.filter(c => c.id !== contactId));
      setEditedDeal(prev => ({ ...prev, contact_ids: prev.contact_ids.filter(id => id !== contactId) }));
      toast({ title: 'Success', description: 'Contact unlinked' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleLinkCompany = async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company || linkedCompanies.find(c => c.id === companyId)) return;
    try {
      await supabase.from('deal_companies').insert({ deal_id: deal.id, company_id: companyId });
      setLinkedCompanies(prev => [...prev, company]);
      setEditedDeal(prev => ({ ...prev, company_ids: [...prev.company_ids, companyId] }));
      toast({ title: 'Success', description: 'Company linked' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleLinkContact = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact || linkedContacts.find(c => c.id === contactId)) return;
    try {
      await supabase.from('deal_contacts').insert({ deal_id: deal.id, contact_id: contactId });
      setLinkedContacts(prev => [...prev, contact]);
      setEditedDeal(prev => ({ ...prev, contact_ids: [...prev.contact_ids, contactId] }));
      toast({ title: 'Success', description: 'Contact linked' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Payment Terms Management
  const addPaymentTerm = () => {
    const newTerm: PaymentTerm = {
      installment_number: paymentTerms.length + 1,
      amount_type: 'percentage',
      amount_value: 0,
      due_date: '',
      notes: ''
    };
    setPaymentTerms(prev => [...prev, newTerm]);
  };

  const updatePaymentTerm = (index: number, updatedTerm: PaymentTerm) => {
    setPaymentTerms(prev => prev.map((term, i) => i === index ? updatedTerm : term));
  };

  const removePaymentTerm = (index: number) => {
    setPaymentTerms(prev => prev.filter((_, i) => i !== index));
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
        const termsToInsert = paymentTerms.map((term, index) => ({
          deal_id: deal.id,
          tenant_id: currentTenant.id,
          installment_number: index + 1,
          amount_type: term.amount_type,
          amount_value: term.amount_value,
          due_date: term.due_date || null,
          notes: term.notes || null,
          calculated_amount: term.amount_type === 'percentage' && deal.value
            ? (deal.value * term.amount_value) / 100
            : term.amount_value
        }));

        await supabase
          .from('deal_payment_terms')
          .insert(termsToInsert);
      }

      setEditingPaymentTerms(false);
      await fetchPaymentTerms();
      
      toast({
        title: 'Success',
        description: 'Payment terms updated successfully',
      });
    } catch (error: any) {
      console.error('Error saving payment terms:', error);
      toast({
        title: 'Error',
        description: 'Failed to save payment terms',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl font-bold">{deal.name}</h2>
            {deal.deal_stages && (
              <Badge 
                className={`text-white ${deal.deal_stages.win_percentage >= 80 ? 'bg-green-500' : 
                                       deal.deal_stages.win_percentage >= 60 ? 'bg-orange-500' :
                                       deal.deal_stages.win_percentage >= 30 ? 'bg-yellow-500' :
                                       deal.deal_stages.win_percentage >= 10 ? 'bg-blue-500' :
                                       'bg-gray-500'}`}
                variant="secondary"
              >
                {deal.deal_stages.name} ({deal.deal_stages.win_percentage}%)
              </Badge>
            )}
            {nextTodo && (
              <Badge variant="outline">
                Next: {nextTodo.title}
                {nextTodo.due_date && ` (${formatDate(nextTodo.due_date)})`}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Customer: {deal.customers?.name || 'Not assigned'}
          </p>
        </div>
        <div className="flex gap-2">
          {oneDriveSettings?.enabled && (
            <Button variant="outline" onClick={handleOpenFolder}>
              <Folder className="h-4 w-4 mr-2" />
              Open Folder
            </Button>
          )}
          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Deal
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Linked Entities */}
        <div className="lg:col-span-1 space-y-4">
          {/* Customer & Site Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Customer & Site
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Customer</Label>
                {editMode ? (
                  <Select
                    value={editedDeal.customer_id}
                    onValueChange={(value) => setEditedDeal(prev => ({ ...prev, customer_id: value }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm font-medium">
                    {deal.customers?.name || 'Not assigned'}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Site</Label>
                {editMode ? (
                  <div className="flex gap-1">
                    <Select
                      value={editedDeal.site_id}
                      onValueChange={(value) => setEditedDeal(prev => ({ ...prev, site_id: value }))}
                    >
                      <SelectTrigger className="h-8 text-sm flex-1">
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-site-selected">No Site</SelectItem>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setShowSiteModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  deal.sites?.name ? (
                    <button
                      className="text-sm font-medium underline hover:opacity-80"
                      onClick={() => navigate('/sites', { state: { highlightSiteId: deal.site_id } })}
                    >
                      {deal.sites.name}
                    </button>
                  ) : (
                    <div className="text-sm font-medium">Not assigned</div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Linked Companies */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4" />
                  Companies
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowCompanyModal(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Search and Select Companies */}
                <div className="mb-3">
                  <SearchableSelect
                    value=""
                    onValueChange={handleLinkCompany}
                    options={companies.filter(company => !linkedCompanies.find(lc => lc.id === company.id))}
                    placeholder="Link company..."
                    searchPlaceholder="Search companies..."
                    emptyText="No companies found"
                  />
                </div>

                {linkedCompanies.length > 0 ? (
                  linkedCompanies.map((company) => (
                    <div key={company.id} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                      <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{company.name}</span>
                      {editMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => handleUnlinkCompany(company.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No companies linked
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Linked Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  Contacts
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setShowContactModal(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Search and Select Contacts */}
                <div className="mb-3">
                  <SearchableSelect
                    value=""
                    onValueChange={handleLinkContact}
                    options={contacts.filter(contact => !linkedContacts.find(lc => lc.id === contact.id))}
                    placeholder="Link contact..."
                    searchPlaceholder="Search contacts..."
                    emptyText="No contacts found"
                    renderOption={(contact) => `${contact.first_name} ${contact.last_name || ''} ${contact.email ? `(${contact.email})` : ''}`.trim()}
                  />
                </div>

                {linkedContacts.length > 0 ? (
                  linkedContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                      <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{contact.first_name} {contact.last_name}</div>
                        {contact.email && (
                          <div className="text-xs text-muted-foreground truncate">
                            {contact.email}
                          </div>
                        )}
                      </div>
                      {editMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => handleUnlinkContact(contact.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No contacts linked
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <DealTodos ref={dealTodosRef} dealId={deal.id} dealName={deal.name} />

          <EntityRelationships 
            entityType="deal" 
            entityId={deal.id} 
            title="Linked Companies & Contacts"
          />

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Activities</span>
                <span className="font-medium">{activities.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Payment Terms</span>
                <span className="font-medium">{paymentTerms.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(deal.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Deal Info */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
              <CardDescription>Basic deal details and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Stage</Label>
                  {editMode ? (
                    <Select
                      value={editedDeal.stage_id}
                      onValueChange={(value) => setEditedDeal(prev => ({ ...prev, stage_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name} ({stage.win_percentage}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{getCurrentStage()?.name || 'Not set'}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label>Deal Value</Label>
                  {editMode ? (
                    <Input
                      type="number"
                      value={editedDeal.value}
                      onChange={(e) => setEditedDeal(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{deal.value ? formatCurrency(deal.value) : 'Not set'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Currency</Label>
                  {editMode ? (
                    <Select
                      value={editedDeal.currency_id}
                      onValueChange={(value) => setEditedDeal(prev => ({ ...prev, currency_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCurrencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.code} - {currency.name} ({currency.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                       <span>
                         {deal.currency_id && availableCurrencies.find(c => c.id === deal.currency_id) ? 
                           `${availableCurrencies.find(c => c.id === deal.currency_id)?.code} (${availableCurrencies.find(c => c.id === deal.currency_id)?.symbol})` :
                           currentTenant?.default_currency_id ? 
                             `${availableCurrencies.find(c => c.id === currentTenant.default_currency_id)?.code || 'USD'} (${availableCurrencies.find(c => c.id === currentTenant.default_currency_id)?.symbol || '$'})` :
                             'Not set'
                         }
                       </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Expected Close Date</Label>
                  {editMode ? (
                    <Input
                      type="date"
                      value={editedDeal.expected_close_date}
                      onChange={(e) => setEditedDeal(prev => ({ ...prev, expected_close_date: e.target.value }))}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(deal.expected_close_date)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Assigned Salesperson</Label>
                  {editMode ? (
                    <Select
                      value={editedDeal.assigned_to}
                      onValueChange={(value) => setEditedDeal(prev => ({ ...prev, assigned_to: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select salesperson" />
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
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {deal.assigned_user ? 
                          `${deal.assigned_user.first_name} ${deal.assigned_user.last_name}` : 
                          'Not assigned'
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Description</Label>
                {editMode ? (
                  <Textarea
                    value={editedDeal.description}
                    onChange={(e) => setEditedDeal(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Deal description"
                    rows={3}
                  />
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    {deal.description || 'No description provided'}
                  </div>
                )}
              </div>

              <div>
                <Label>Customer Reference Number</Label>
                {editMode ? (
                  <Input
                    value={editedDeal.customer_reference_number}
                    onChange={(e) => setEditedDeal(prev => ({ ...prev, customer_reference_number: e.target.value }))}
                    placeholder="Customer reference number"
                  />
                ) : (
                  <div className="p-2 bg-muted rounded">
                    {deal.customer_reference_number || 'Not set'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Terms & Installments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Instalment Terms & Installments</CardTitle>
                  <CardDescription>Manage payment schedule and installments for this deal</CardDescription>
                </div>
                <div className="flex gap-2">
                  {!editingPaymentTerms ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setEditingPaymentTerms(true)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Terms
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={addPaymentTerm}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Installment
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setEditingPaymentTerms(false);
                          fetchPaymentTerms(); // Reset changes
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={savePaymentTerms}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Terms
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentTerms.length > 0 ? (
                  paymentTerms.map((term, index) => (
                    <div key={term.id || index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Installment {index + 1}</h4>
                        {editingPaymentTerms && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePaymentTerm(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-sm">Amount Type</Label>
                          {editingPaymentTerms ? (
                            <Select
                              value={term.amount_type}
                              onValueChange={(value) => updatePaymentTerm(index, { 
                                ...term, 
                                amount_type: value as 'fixed' | 'percentage' 
                              })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-sm font-medium">
                              {term.amount_type === 'percentage' ? 'Percentage (%)' : 'Fixed Amount'}
                            </div>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm">
                            {term.amount_type === 'percentage' ? 'Percentage' : 'Amount'}
                          </Label>
                          {editingPaymentTerms ? (
                            <Input
                              type="number"
                              value={term.amount_value}
                              onChange={(e) => updatePaymentTerm(index, { 
                                ...term, 
                                amount_value: parseFloat(e.target.value) || 0 
                              })}
                              placeholder={term.amount_type === 'percentage' ? '0' : '0.00'}
                              className="h-8"
                            />
                          ) : (
                            <div className="text-sm font-medium">
                              {term.amount_type === 'percentage' 
                                ? `${term.amount_value}%` 
                                : formatCurrency(term.amount_value)
                              }
                            </div>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm">Due Date</Label>
                          {editingPaymentTerms ? (
                            <Input
                              type="date"
                              value={term.due_date || ''}
                              onChange={(e) => updatePaymentTerm(index, { 
                                ...term, 
                                due_date: e.target.value 
                              })}
                              className="h-8"
                            />
                          ) : (
                            <div className="text-sm font-medium">
                              {term.due_date ? formatDate(term.due_date) : 'Not set'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Calculated Amount */}
                      {term.amount_type === 'percentage' && deal.value && (
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Calculated Amount:</span>
                            <span className="font-medium">
                              {formatCurrency((deal.value * term.amount_value) / 100)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <Label className="text-sm">Notes</Label>
                        {editingPaymentTerms ? (
                          <Textarea
                            value={term.notes || ''}
                            onChange={(e) => updatePaymentTerm(index, { 
                              ...term, 
                              notes: e.target.value 
                            })}
                            placeholder="Add notes for this installment..."
                            rows={2}
                            className="text-sm"
                          />
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {term.notes || 'No notes'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">No Instalment Terms Set</h3>
                    <p className="text-sm mb-4">Add installment terms to break down the deal value into manageable payments.</p>
                    <Button onClick={addPaymentTerm} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Installment
                    </Button>
                  </div>
                )}

                {/* Add New Term Button (when editing and terms exist) */}
                {editingPaymentTerms && paymentTerms.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={addPaymentTerm}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Installment
                  </Button>
                )}

                {/* Payment Summary */}
                {paymentTerms.length > 0 && deal.value && (
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Deal Value:</span>
                        <span className="font-medium">{formatCurrency(deal.value)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Planned:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            paymentTerms.reduce((sum, term) => {
                              if (term.amount_type === 'percentage') {
                                return sum + (deal.value * term.amount_value) / 100;
                              }
                              return sum + term.amount_value;
                            }, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activities Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activities & Notes</CardTitle>
                  <CardDescription>Activity log and notes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new note */}
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={addNote} disabled={!newNote.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <Separator />
              
              {/* Activity list */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.filter(activity => activity.type !== 'task').map((activity) => (
                  <div key={activity.id} className="flex gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <Activity className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {activity.title && (
                        <div className="font-medium text-sm">{activity.title}</div>
                      )}
                      {activity.description && (
                        <div className="text-sm text-muted-foreground">{activity.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {activity.profiles ? 
                          `${activity.profiles.first_name} ${activity.profiles.last_name}` : 
                          'Unknown'
                        } • {formatDate(activity.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {activities.filter(activity => activity.type !== 'task').length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No activities yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Add Modals */}
      <QuickAddCompanyModal
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onCompanyCreated={handleCompanyCreated}
      />

      <UnifiedQuickAddContactModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        onContactCreated={handleContactCreated}
      />

      <QuickAddSiteModal
        open={showSiteModal}
        onClose={() => setShowSiteModal(false)}
        onSiteCreated={handleSiteCreated}
      />

      {/* Folder Modal */}
      <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deal Folder</DialogTitle>
            <DialogDescription>
              OneDrive folder path for this deal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folder Path</Label>
              <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                {dealFolderPath}
              </div>
            </div>
            <div>
              <Label>Custom Folder Path</Label>
              <Input
                value={customFolderPath}
                onChange={(e) => setCustomFolderPath(e.target.value)}
                placeholder="Enter custom folder path"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              // Here you would implement the folder opening logic
              window.open(`https://onedrive.live.com/`, '_blank');
              setShowFolderModal(false);
            }}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in OneDrive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload File Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload a file to this deal's OneDrive folder
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
              />
            </div>
            <div>
              <Label htmlFor="upload-notes">Notes (Optional)</Label>
              <Textarea
                id="upload-notes"
                placeholder="Add any notes about this file..."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button disabled={!selectedFile}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});