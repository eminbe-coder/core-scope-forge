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
import { Plus, Building2, User, MapPin } from 'lucide-react';

const dealSchema = z.object({
  name: z.string().min(1, 'Deal name is required'),
  description: z.string().optional(),
  customer_id: z.string().min(1, 'Customer is required'),
  site_id: z.string().optional(),
  value: z.string().optional(),
  currency_id: z.string().optional(),
  status: z.enum(['lead', 'proposal', 'negotiation', 'won', 'lost']),
  probability: z.string().optional(),
  expected_close_date: z.string().optional(),
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

export function CreateDealForm({ leadType, leadId, onSuccess }: CreateDealFormProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
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
      status: 'lead',
      probability: '10',
      expected_close_date: '',
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

      // Set default currency to tenant's default
      if (currentTenant?.default_currency_id) {
        form.setValue('currency_id', currentTenant.default_currency_id);
      }
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
        status: data.status,
        probability: data.probability ? parseInt(data.probability) : null,
        expected_close_date: data.expected_close_date || null,
        notes: data.notes || null,
        tenant_id: currentTenant.id,
      };

      const { data: deal, error } = await supabase
        .from('deals')
        .insert(dealData)
        .select()
        .single();

      if (error) throw error;

      // If converting from a lead, remove lead status
      if (leadType && leadId) {
        const tableName = leadType === 'contact' ? 'contacts' : 
                         leadType === 'company' ? 'companies' : 'sites';
        
        await supabase
          .from(tableName)
          .update({ is_lead: false })
          .eq('id', leadId);
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="proposal">Proposal</SelectItem>
                          <SelectItem value="negotiation">Negotiation</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
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