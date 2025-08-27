import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { QuickAddCompanyModal } from '@/components/modals/QuickAddCompanyModal';
import { QuickAddContactModal } from '@/components/modals/QuickAddContactModal';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { Plus, Building2, User, MapPin, Calendar, Trash2 } from 'lucide-react';

const dealSchema = z.object({
  name: z.string().min(1, 'Deal name is required'),
  description: z.string().optional(),
  customer_id: z.string().min(1, 'Customer is required'),
  site_id: z.string().optional(),
  value: z.string().optional(),
  currency_id: z.string().optional(),
  stage_id: z.string().min(1, 'Stage is required'),
  priority: z.enum(['low', 'medium', 'high']),  
  probability: z.string().optional(),
  expected_close_date: z.string().optional(),
  assigned_to: z.string().optional(),
  notes: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface CreateDealFormProps {
  leadType?: 'company' | 'contact' | 'site' | null;
  leadId?: string | null;
  onSuccess?: () => void;
}

interface Customer {
  id: string;
  name: string;
  type: 'company' | 'individual';
}

interface Company {
  id: string;
  name: string;
  email?: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
}

interface Site {
  id: string;
  name: string;
  address: string;
  customer_id?: string;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

interface DealStage {
  id: string;
  name: string;
  description?: string;
  win_percentage: number;
  sort_order: number;
  active: boolean;
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

export function CreateDealForm({ leadType, leadId, onSuccess }: CreateDealFormProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [tenantUsers, setTenantUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedCustomerType, setSelectedCustomerType] = useState<'existing' | 'company' | 'contact'>('existing');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [leadData, setLeadData] = useState<any>(null);

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      name: '',
      description: '',
      customer_id: '',
      site_id: '',
      value: '',
      currency_id: '',
      stage_id: '',
      priority: 'medium',
      probability: '10',
      expected_close_date: '',
      assigned_to: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant]);

  useEffect(() => {
    if (leadType && leadId) {
      loadLeadData();
    }
  }, [leadType, leadId]);

  const loadData = async () => {
    try {
      // Load customers
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, type')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true)
        .order('name');

      if (customerError) throw customerError;
      setCustomers(customerData || []);

      // Load companies (not customers yet)
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, email')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true)
        .order('name');

      if (companyError) throw companyError;
      setCompanies(companyData || []);

      // Load contacts (not customers yet)
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true)
        .order('first_name');

      if (contactError) throw contactError;
      setContacts(contactData || []);

      // Load sites
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('id, name, address, customer_id')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true)
        .order('name');

      if (siteError) throw siteError;
      setSites(siteData || []);

      // Load currencies
      const { data: currencyData, error: currencyError } = await supabase
        .from('currencies')
        .select('id, code, name, symbol')
        .eq('active', true)
        .order('code');

      if (currencyError) throw currencyError;
      setCurrencies(currencyData || []);

      // Load deal stages
      const { data: stageData, error: stageError } = await supabase
        .from('deal_stages')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true)
        .order('sort_order');

      if (stageError) throw stageError;
      setStages(stageData || []);

      // Set default currency to tenant's default
      if (currentTenant?.default_currency_id) {
        form.setValue('currency_id', currentTenant.default_currency_id);
      }

      // Set default stage to first stage
      if (stageData && stageData.length > 0) {
        form.setValue('stage_id', stageData[0].id);
      }

      // Load tenant users for salesperson assignment
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          user_tenant_memberships!inner(tenant_id, active)
        `)
        .eq('user_tenant_memberships.tenant_id', currentTenant?.id)
        .eq('user_tenant_memberships.active', true);

      if (userError) throw userError;
      
      const users = userData?.map(user => ({
        id: user.id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        email: user.email,
      })) || [];
      
      setTenantUsers(users);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form data',
        variant: 'destructive',
      });
    }
  };

  const loadLeadData = async () => {
    if (!leadType || !leadId) return;

    try {
      let query;
      let tableName;

      switch (leadType) {
        case 'company':
          tableName = 'companies';
          query = supabase.from('companies').select('*').eq('id', leadId).single();
          break;
        case 'contact':
          tableName = 'contacts';
          query = supabase.from('contacts').select('*').eq('id', leadId).single();
          break;
        case 'site':
          tableName = 'sites';
          query = supabase.from('sites').select('*, customers(name)').eq('id', leadId).single();
          break;
        default:
          return;
      }

      const { data, error } = await query;
      if (error) throw error;

      setLeadData(data);
      
      // Pre-populate form based on lead data
      if (leadType === 'company') {
        form.setValue('name', `Deal with ${data.name}`);
      } else if (leadType === 'contact') {
        const contactName = `${data.first_name} ${data.last_name || ''}`.trim();
        form.setValue('name', `Deal with ${contactName}`);
      } else if (leadType === 'site') {
        form.setValue('name', `Deal for ${data.name}`);
        if (data.customer_id) {
          form.setValue('customer_id', data.customer_id);
        }
      }
    } catch (error) {
      console.error('Error loading lead data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load lead data',
        variant: 'destructive',
      });
    }
  };

  const createCustomerFromCompany = async (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return null;

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: company.name,
        type: 'company',
        email: company.email,
        tenant_id: currentTenant?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const createCustomerFromContact = async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return null;

    const customerName = `${contact.first_name} ${contact.last_name || ''}`.trim();
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: customerName,
        type: 'individual',
        email: contact.email,
        tenant_id: currentTenant?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const onSubmit = async (data: DealFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      let customerId = data.customer_id;

      // Calculate payment terms totals
      const dealValue = data.value ? parseFloat(data.value) : 0;
      const updatedPaymentTerms = calculatePaymentTerms(paymentTerms, dealValue);

      // If creating customer from company or contact
      if (selectedCustomerType === 'company' && data.customer_id) {
        const customer = await createCustomerFromCompany(data.customer_id);
        customerId = customer?.id || '';
      } else if (selectedCustomerType === 'contact' && data.customer_id) {
        const customer = await createCustomerFromContact(data.customer_id);
        customerId = customer?.id || '';
      }

      const dealData = {
        name: data.name,
        description: data.description || null,
        customer_id: customerId,
        site_id: data.site_id || null,
        value: data.value ? parseFloat(data.value) : null,
        currency_id: data.currency_id || null,
        stage_id: data.stage_id,
        priority: data.priority,
        probability: data.probability ? parseInt(data.probability) : null,
        expected_close_date: data.expected_close_date || null,
        assigned_to: data.assigned_to || null,
        notes: data.notes || null,
        tenant_id: currentTenant.id,
      };

      const { data: deal, error } = await supabase
        .from('deals')
        .insert(dealData)
        .select()
        .single();

      if (error) throw error;

      // Save payment terms if any
      if (updatedPaymentTerms.length > 0) {
        const paymentTermsData = updatedPaymentTerms.map(term => ({
          deal_id: deal.id,
          installment_number: term.installment_number,
          amount_type: term.amount_type,
          amount_value: term.amount_value,
          calculated_amount: term.calculated_amount,
          due_date: term.due_date || null,
          notes: term.notes || null,
          tenant_id: currentTenant.id,
        }));

        const { error: paymentError } = await supabase
          .from('deal_payment_terms')
          .insert(paymentTermsData);

        if (paymentError) throw paymentError;
      }

      // If converting from a lead, remove lead status and migrate files
      if (leadType && leadId) {
        const tableName = leadType === 'contact' ? 'contacts' : 
                         leadType === 'company' ? 'companies' : 'sites';
        
        await supabase
          .from(tableName)
          .update({ is_lead: false })
          .eq('id', leadId);

        // Migrate lead files to deal files
        try {
          const { data: leadFiles } = await supabase
            .from('lead_files')
            .select('*')
            .eq('entity_id', leadId)
            .eq('entity_type', leadType)
            .eq('tenant_id', currentTenant.id);

          if (leadFiles && leadFiles.length > 0) {
            const dealFilesData = leadFiles.map(file => ({
              deal_id: deal.id,
              name: file.name,
              file_path: file.file_path.replace('lead-files/', 'deal-files/'),
              mime_type: file.mime_type,
              file_size: file.file_size,
              notes: file.notes,
              created_by: file.created_by,
              tenant_id: currentTenant.id,
            }));

            // Copy files in storage
            for (const file of leadFiles) {
              const { data: fileData } = await supabase.storage
                .from('lead-files')
                .download(file.file_path);
              
              if (fileData) {
                const newPath = file.file_path.replace('lead-files/', 'deal-files/');
                await supabase.storage
                  .from('deal-files')
                  .upload(newPath, fileData);
              }
            }

            await supabase.from('deal_files').insert(dealFilesData);
            await supabase.from('lead_files').delete().eq('entity_id', leadId).eq('entity_type', leadType);
            await supabase.storage.from('lead-files').remove(leadFiles.map(f => f.file_path));
          }
        } catch (fileError) {
          console.error('Error migrating files:', fileError);
        }
      }

      toast({
        title: 'Success',
        description: 'Deal created successfully',
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating deal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create deal',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyCreated = async (company: Company) => {
    setShowCompanyModal(false);
    await loadData();
    // Auto-select the newly created company
    setSelectedCustomerType('company');
    form.setValue('customer_id', company.id);
  };

  const handleContactCreated = async (contact: Contact) => {
    setShowContactModal(false);
    await loadData();
    // Auto-select the newly created contact
    setSelectedCustomerType('contact');
    form.setValue('customer_id', contact.id);
  };

  const calculatePaymentTerms = (terms: PaymentTerm[], totalValue: number): PaymentTerm[] => {
    if (terms.length === 0 || totalValue === 0) return terms;

    const updatedTerms = [...terms];
    let totalAllocated = 0;

    // Calculate amounts for all but the last installment
    for (let i = 0; i < updatedTerms.length - 1; i++) {
      const term = updatedTerms[i];
      if (term.amount_type === 'percentage') {
        term.calculated_amount = (totalValue * term.amount_value) / 100;
      } else {
        term.calculated_amount = term.amount_value;
      }
      totalAllocated += term.calculated_amount;
    }

    // Calculate the final installment to balance the total
    if (updatedTerms.length > 0) {
      const lastTerm = updatedTerms[updatedTerms.length - 1];
      lastTerm.calculated_amount = totalValue - totalAllocated;
    }

    return updatedTerms;
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

  const removePaymentTerm = (index: number) => {
    const updatedTerms = paymentTerms.filter((_, i) => i !== index);
    // Renumber installments
    const renumberedTerms = updatedTerms.map((term, i) => ({
      ...term,
      installment_number: i + 1,
    }));
    setPaymentTerms(renumberedTerms);
  };

  const updatePaymentTerm = (index: number, field: keyof PaymentTerm, value: any) => {
    const updatedTerms = [...paymentTerms];
    updatedTerms[index] = { ...updatedTerms[index], [field]: value };
    setPaymentTerms(updatedTerms);
  };

  const dealValue = form.watch('value') ? parseFloat(form.watch('value') || '0') : 0;
  const calculatedTerms = calculatePaymentTerms(paymentTerms, dealValue);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Deal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter deal name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stage_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name} ({stage.win_percentage}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Deal description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Selection */}
              <div className="space-y-4">
                <Label>Customer *</Label>
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    type="button"
                    variant={selectedCustomerType === 'existing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCustomerType('existing')}
                  >
                    Existing Customer
                  </Button>
                  <Button
                    type="button"
                    variant={selectedCustomerType === 'company' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCustomerType('company')}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Company
                  </Button>
                  <Button
                    type="button"
                    variant={selectedCustomerType === 'contact' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCustomerType('contact')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                </div>

                {selectedCustomerType === 'existing' && (
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <SearchableSelect
                            options={customers}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select existing customer"
                            searchPlaceholder="Search customers..."
                            emptyText="No customers found"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedCustomerType === 'company' && (
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <SearchableSelect
                              options={companies}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select company"
                              searchPlaceholder="Search companies..."
                              emptyText="No companies found"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCompanyModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {selectedCustomerType === 'contact' && (
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <SearchableSelect
                              options={contacts}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select contact"
                              searchPlaceholder="Search contacts..."
                              emptyText="No contacts found"
                              renderOption={(contact) => 
                                `${contact.first_name} ${contact.last_name || ''}`.trim()
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowContactModal(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="site_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site (Optional)</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={sites}
                          value={field.value || ''}
                          onValueChange={field.onChange}
                          placeholder="Select site"
                          searchPlaceholder="Search sites..."
                          emptyText="No sites found"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.id}>
                              {currency.code} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="expected_close_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Close Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salesperson</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select salesperson" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">No Assignment</SelectItem>
                        {tenantUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Terms Section */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Payment Terms</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure installment payments for this deal
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPaymentTerm}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Installment
                  </Button>
                </div>

                {paymentTerms.length > 0 && (
                  <div className="space-y-4">
                    {paymentTerms.map((term, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Installment #{term.installment_number}</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePaymentTerm(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Amount Type</Label>
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
                            <Label>
                              {term.amount_type === 'percentage' ? 'Percentage (%)' : 'Amount'}
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step={term.amount_type === 'percentage' ? '0.1' : '0.01'}
                              max={term.amount_type === 'percentage' ? '100' : undefined}
                              value={term.amount_value}
                              onChange={(e) => 
                                updatePaymentTerm(index, 'amount_value', parseFloat(e.target.value) || 0)
                              }
                              placeholder={term.amount_type === 'percentage' ? '0.0' : '0.00'}
                            />
                          </div>

                          <div>
                            <Label>Due Date (Optional)</Label>
                            <Input
                              type="date"
                              value={term.due_date || ''}
                              onChange={(e) => 
                                updatePaymentTerm(index, 'due_date', e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <Label>Calculated Amount</Label>
                            <Input
                              value={
                                calculatedTerms[index]?.calculated_amount?.toFixed(2) || '0.00'
                              }
                              disabled
                              className="bg-muted"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label>Notes (Optional)</Label>
                          <Textarea
                            value={term.notes || ''}
                            onChange={(e) => 
                              updatePaymentTerm(index, 'notes', e.target.value)
                            }
                            placeholder="Additional notes for this installment"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Payment Summary */}
                    {dealValue > 0 && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Payment Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Deal Value:</span>
                            <span className="font-medium">{dealValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Allocated:</span>
                            <span className="font-medium">
                              {calculatedTerms.reduce((sum, term) => sum + (term.calculated_amount || 0), 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span>Balance:</span>
                            <span className={`font-medium ${
                              Math.abs(dealValue - calculatedTerms.reduce((sum, term) => sum + (term.calculated_amount || 0), 0)) < 0.01
                                ? 'text-green-600' 
                                : 'text-orange-600'
                            }`}>
                              {(dealValue - calculatedTerms.reduce((sum, term) => sum + (term.calculated_amount || 0), 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {paymentTerms.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No payment terms configured. Add installments to set up payment schedule.
                  </div>
                )}
              </Card>

              <div className="flex justify-end gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Deal'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <QuickAddCompanyModal
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onCompanyCreated={handleCompanyCreated}
      />

      <QuickAddContactModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        onContactCreated={handleContactCreated}
      />
    </>
  );
}