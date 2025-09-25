import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedEntitySelect } from '@/components/ui/unified-entity-select';
import { MultiSelectDropdown } from '@/components/deals/MultiSelectDropdown';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { SolutionCategorySelect } from '@/components/ui/solution-category-select';

const contractSchema = z.object({
  name: z.string().min(1, 'Contract name is required'),
  description: z.string().optional(),
  value: z.number().min(0, 'Value must be positive').optional(),
  currency_id: z.string().optional(),
  customer_id: z.string().optional(),
  site_id: z.string().optional(),
  signed_date: z.string().optional(),
  end_date: z.string().optional(),
  customer_reference_number: z.string().optional(),
  assigned_to: z.string().optional(),
  notes: z.string().optional(),
  solution_category_ids: z.array(z.string()).optional(),
});

interface Deal {
  id: string;
  name: string;
  description?: string;
  value?: number;
  currency_id?: string;
  customer_id?: string;
  site_id?: string;
  customer_reference_number?: string;
  assigned_to?: string;
  notes?: string;
  solution_category_ids?: string[];
}

interface PaymentTerm {
  installment_number: number;
  amount_type: string;
  amount_value: number;
  due_date?: string;
  stage_id?: string;
  notes?: string;
}

interface CreateContractFormProps {
  deal?: Deal | null;
  contract?: {
    id: string;
    name: string;
    description?: string;
    value?: number;
    currency_id?: string;
    customer_id?: string;
    site_id?: string;
    customer_reference_number?: string;
    assigned_to?: string;
    notes?: string;
    status: string;
    signed_date?: string;
    start_date?: string;
    end_date?: string;
    solution_category_ids?: string[];
  };
  onSuccess: () => void;
}

export const CreateContractForm = ({ deal, contract, onSuccess }: CreateContractFormProps) => {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [paymentStages, setPaymentStages] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  const form = useForm<z.infer<typeof contractSchema>>({
    resolver: zodResolver(contractSchema),
    defaultValues: contract ? {
      name: contract.name,
      description: contract.description || '',
      value: contract.value || undefined,
      currency_id: contract.currency_id || '',
      customer_id: contract.customer_id || '',
      site_id: contract.site_id || '',
      customer_reference_number: contract.customer_reference_number || '',
      assigned_to: contract.assigned_to || '',
      notes: contract.notes || '',
      signed_date: contract.signed_date || '',
      end_date: contract.end_date || '',
      solution_category_ids: contract.solution_category_ids || [],
    } : deal ? {
      name: deal.name,
      description: deal.description || '',
      value: deal.value || undefined,
      currency_id: deal.currency_id || '',
      customer_id: deal.customer_id || '',
      site_id: deal.site_id || '',
      customer_reference_number: deal.customer_reference_number || '',
      assigned_to: deal.assigned_to || '',
      notes: deal.notes || '',
      solution_category_ids: deal.solution_category_ids || [],
      signed_date: new Date().toISOString().split('T')[0],
    } : {
      name: '',
      description: '',
      value: undefined,
      currency_id: '',
      customer_id: '',
      site_id: '',
      customer_reference_number: '',
      assigned_to: '',
      notes: '',
      solution_category_ids: [],
      signed_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (currentTenant?.id) {
      fetchData();
      if (deal?.id) {
        fetchDealPaymentTerms();
      }
      if (contract?.id) {
        fetchContractPaymentTerms();
      }
      // Set default currency to tenant's default
      if (currentTenant?.default_currency_id && !deal?.currency_id) {
        form.setValue('currency_id', currentTenant.default_currency_id);
      }
    }
  }, [currentTenant?.id, deal?.id]);

  const fetchData = async () => {
    try {
      const [currenciesRes, customersRes, companiesRes, contactsRes, sitesRes, profilesRes, paymentStagesRes] = await Promise.all([
        supabase.from('currencies').select('*').eq('active', true),
        supabase.from('customers').select('*').eq('tenant_id', currentTenant?.id),
        supabase.from('companies').select('*').eq('tenant_id', currentTenant?.id),
        supabase.from('contacts').select('*').eq('tenant_id', currentTenant?.id),
        supabase.from('sites').select('*').eq('tenant_id', currentTenant?.id),
        supabase.from('user_tenant_memberships').select(`
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `).eq('tenant_id', currentTenant?.id).eq('active', true),
        supabase.from('contract_payment_stages').select('*').eq('tenant_id', currentTenant?.id).order('sort_order')
      ]);

      setCurrencies(currenciesRes.data || []);
      setCustomers(customersRes.data || []);
      setCompanies(companiesRes.data || []);
      setContacts(contactsRes.data || []);
      setSites(sitesRes.data || []);
      setProfiles((profilesRes.data || []).map((membership: any) => membership.profiles).filter(Boolean));
      setPaymentStages(paymentStagesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load form data');
    }
  };

  const fetchDealPaymentTerms = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_payment_terms')
        .select('*')
        .eq('deal_id', deal?.id)
        .order('installment_number');

      if (error) throw error;
      
      const terms = data?.map(term => ({
        installment_number: term.installment_number,
        amount_type: term.amount_type,
        amount_value: term.amount_value,
        due_date: term.due_date || '',
        stage_id: paymentStages.find(stage => stage.name === 'Pending Task')?.id || '',
        notes: term.notes || '',
      })) || [];

      setPaymentTerms(terms);
    } catch (error) {
      console.error('Error fetching deal payment terms:', error);
    }
  };

  const fetchContractPaymentTerms = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_payment_terms')
        .select('*')
        .eq('contract_id', contract?.id)
        .order('installment_number');

      if (error) throw error;
      
      const terms = data?.map(term => ({
        installment_number: term.installment_number,
        amount_type: term.amount_type,
        amount_value: term.amount_value,
        due_date: term.due_date || '',
        stage_id: term.stage_id || paymentStages.find(stage => stage.name === 'Pending')?.id || '',
        notes: term.notes || '',
      })) || [];

      setPaymentTerms(terms);
    } catch (error) {
      console.error('Error fetching contract payment terms:', error);
    }
  };

  const addPaymentTerm = () => {
    setPaymentTerms([
      ...paymentTerms,
      {
        installment_number: paymentTerms.length + 1,
        amount_type: 'percentage',
        amount_value: 0,
        due_date: '',
        stage_id: paymentStages.find(stage => stage.name === 'Pending Task')?.id || '',
        notes: '',
      },
    ]);
  };

  const removePaymentTerm = (index: number) => {
    const newTerms = paymentTerms.filter((_, i) => i !== index);
    setPaymentTerms(newTerms.map((term, i) => ({ ...term, installment_number: i + 1 })));
  };

  const updatePaymentTerm = (index: number, field: keyof PaymentTerm, value: any) => {
    const newTerms = [...paymentTerms];
    newTerms[index] = { ...newTerms[index], [field]: value };
    setPaymentTerms(newTerms);
  };

  const onSubmit = async (values: z.infer<typeof contractSchema>) => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      // Get payment stages for this tenant
      const { data: stages } = await supabase
        .from('contract_payment_stages')
        .select('*')
        .eq('tenant_id', currentTenant.id);

      const dueStage = stages?.find(s => s.name === 'Due');
      const paidStage = stages?.find(s => s.name === 'Paid');

      // Create contract
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .insert({
          tenant_id: currentTenant.id,
          deal_id: deal?.id || null,
          name: values.name,
          description: values.description || null,
          value: values.value || null,
          currency_id: values.currency_id || null,
          customer_id: values.customer_id || null,
          site_id: values.site_id || null,
          signed_date: values.signed_date || null,
          start_date: values.signed_date || null,
          end_date: values.end_date || null,
          assigned_to: values.assigned_to || null,
          customer_reference_number: values.customer_reference_number || null,
          notes: values.notes || null,
          solution_category_ids: values.solution_category_ids || [],
          sign_date: values.signed_date || null,
        })
        .select()
        .single();

      if (contractError) throw contractError;

      let finalPaymentTerms = paymentTerms;

      // If creating from a deal, fetch and migrate deal payment terms
      if (deal?.id) {
        const { data: dealPaymentTerms } = await supabase
          .from('deal_payment_terms')
          .select('*')
          .eq('deal_id', deal.id)
          .order('installment_number');

        if (dealPaymentTerms && dealPaymentTerms.length > 0) {
          finalPaymentTerms = dealPaymentTerms.map(term => ({
            installment_number: term.installment_number,
            amount_type: term.amount_type,
            amount_value: term.amount_value,
            due_date: term.due_date,
            notes: term.notes,
            stage_id: null,
          }));
        }
      }

      // Create payment terms
      if (finalPaymentTerms.length > 0) {
        const { error: paymentTermsError } = await supabase
          .from('contract_payment_terms')
          .insert(
            finalPaymentTerms.map((term, index) => ({
              contract_id: contractData.id,
              tenant_id: currentTenant.id,
              installment_number: term.installment_number,
              amount_type: term.amount_type,
              amount_value: term.amount_value,
              calculated_amount: term.amount_type === 'percentage' && values.value 
                ? (values.value * term.amount_value) / 100 
                : term.amount_value,
              due_date: term.due_date || null,
              stage_id: index === 0 ? paidStage?.id : dueStage?.id, // First payment as Paid, others as Due
              notes: term.notes || null,
            }))
          );

        if (paymentTermsError) throw paymentTermsError;
      }

      // Create contact relationships
      if (selectedContacts.length > 0) {
        const { error: contactsError } = await supabase
          .from('contract_contacts')
          .insert(
            selectedContacts.map(contactId => ({
              contract_id: contractData.id,
              contact_id: contactId,
              role: 'contact',
            }))
          );

        if (contactsError) throw contactsError;
      }

      // Create company relationships
      if (selectedCompanies.length > 0) {
        const { error: companiesError } = await supabase
          .from('contract_companies')
          .insert(
            selectedCompanies.map(companyId => ({
              contract_id: contractData.id,
              company_id: companyId,
              relationship_type: 'client',
            }))
          );

        if (companiesError) throw companiesError;
      }

      toast.success(contract?.id ? 'Contract updated successfully' : 'Contract created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error(contract?.id ? 'Failed to update contract' : 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contract name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Reference Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reference number" {...field} />
                    </FormControl>
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
                    <Textarea 
                      placeholder="Enter contract description" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Value</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="signed_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Signed Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relationships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <FormControl>
                      <UnifiedEntitySelect
                        value={field.value}
                        onValueChange={field.onChange}
                        customers={customers}
                        companies={[]}
                        contacts={[]}
                        placeholder="Select customer"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div>
                <FormLabel>Contacts</FormLabel>
                <MultiSelectDropdown
                  options={contacts.map(contact => ({
                    id: contact.id,
                    name: `${contact.first_name} ${contact.last_name || ''}`
                  }))}
                  selected={selectedContacts}
                  onSelectionChange={setSelectedContacts}
                  placeholder="Select contacts"
                  searchPlaceholder="Search contacts..."
                />
              </div>

              <div>
                <FormLabel>Companies</FormLabel>
                <MultiSelectDropdown
                  options={companies.map(company => ({
                    id: company.id,
                    name: company.name
                  }))}
                  selected={selectedCompanies}
                  onSelectionChange={setSelectedCompanies}
                  placeholder="Select companies"
                  searchPlaceholder="Search companies..."
                />
              </div>

              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name}
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
                name="solution_category_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solution Categories</FormLabel>
                    <FormControl>
                      <SolutionCategorySelect
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select solution categories..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Instalment Terms</CardTitle>
              <Button type="button" variant="outline" onClick={addPaymentTerm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Term
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentTerms.map((term, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Payment {term.installment_number}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePaymentTerm(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <FormLabel>Amount Type</FormLabel>
                    <Select
                      value={term.amount_type}
                      onValueChange={(value) => updatePaymentTerm(index, 'amount_type', value)}
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
                    <FormLabel>
                      {term.amount_type === 'percentage' ? 'Percentage' : 'Amount'}
                    </FormLabel>
                    <Input
                      type="number"
                      value={term.amount_value}
                      onChange={(e) => updatePaymentTerm(index, 'amount_value', parseFloat(e.target.value) || 0)}
                      placeholder={term.amount_type === 'percentage' ? '0%' : '0.00'}
                    />
                  </div>

                  <div>
                    <FormLabel>Due Date</FormLabel>
                    <Input
                      type="date"
                      value={term.due_date}
                      onChange={(e) => updatePaymentTerm(index, 'due_date', e.target.value)}
                    />
                  </div>

                  <div>
                    <FormLabel>Stage</FormLabel>
                    <Select
                      value={term.stage_id}
                      onValueChange={(value) => updatePaymentTerm(index, 'stage_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentStages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <FormLabel>Notes</FormLabel>
                  <Textarea
                    value={term.notes}
                    onChange={(e) => updatePaymentTerm(index, 'notes', e.target.value)}
                    placeholder="Payment term notes"
                    rows={2}
                  />
                </div>
              </div>
            ))}

            {paymentTerms.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No instalment terms added yet. Click "Add Payment Term" to get started.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about the contract"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Contract'}
          </Button>
        </div>
      </form>
    </Form>
  );
};