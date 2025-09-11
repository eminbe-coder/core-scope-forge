import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PhoneInput } from '@/components/ui/phone-input';
import { QuickAddCompanyModal } from '@/components/modals/QuickAddCompanyModal';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getCountryCodeForCountry } from '@/lib/country-codes';
import { User, Building, Plus, AlertTriangle, Check, ChevronDown } from 'lucide-react';

const unifiedContactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  country_code: z.string().optional(),
  phone_number: z.string().optional(),
  position: z.string().optional(),
  company_id: z.string().optional(),
});

type UnifiedContactFormData = z.infer<typeof unifiedContactSchema>;

interface Company {
  id: string;
  name: string;
  email?: string;
}

interface ExistingContact {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  country_code?: string;
  phone_number?: string;
}

interface DuplicateInfo {
  contact: ExistingContact;
  matchType: 'email' | 'phone';
}

interface UnifiedQuickAddContactModalProps {
  open: boolean;
  onClose: () => void;
  onContactCreated: (contact: { id: string; first_name: string; last_name?: string; email?: string }) => void;
  title?: string;
  includeCompanyField?: boolean;
  includePosition?: boolean;
}

export const UnifiedQuickAddContactModal = ({
  open,
  onClose,
  onContactCreated,
  title = "Quick Add Contact",
  includeCompanyField = true,
  includePosition = true,
}: UnifiedQuickAddContactModalProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [tenantCountryCode, setTenantCountryCode] = useState<string>('+1');

  const form = useForm<UnifiedContactFormData>({
    resolver: zodResolver(unifiedContactSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      country_code: '',
      phone_number: '',
      position: '',
      company_id: '',
    },
  });

  // Load tenant's default country code
  useEffect(() => {
    if (currentTenant?.country) {
      const countryCode = getCountryCodeForCountry(currentTenant.country);
      setTenantCountryCode(countryCode);
      form.setValue('country_code', countryCode);
    }
  }, [currentTenant, form]);

  // Load companies when search changes
  useEffect(() => {
    if (companyOpen && includeCompanyField) {
      searchCompanies(companySearch);
    }
  }, [companySearch, companyOpen, currentTenant, includeCompanyField]);

  const searchCompanies = async (searchTerm: string) => {
    if (!currentTenant) return;

    try {
      let query = supabase
        .from('companies')
        .select('id, name, email')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .limit(20);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error searching companies:', error);
    }
  };

  const checkForDuplicates = async (email?: string, phone?: string): Promise<DuplicateInfo | null> => {
    if (!currentTenant || (!email && !phone)) return null;

    try {
      let query = supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone, country_code, phone_number')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      const conditions = [];
      if (email) {
        conditions.push(`email.eq.${email}`);
      }
      if (phone) {
        conditions.push(`phone.eq.${phone}`);
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const contact = data[0];
        const matchType = contact.email === email ? 'email' : 'phone';
        return { contact, matchType };
      }

      return null;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return null;
    }
  };

  const formatPhone = (countryCode?: string, phoneNumber?: string) => {
    if (!countryCode || !phoneNumber) return '';
    return `${countryCode}${phoneNumber}`;
  };

  const onSubmit = async (data: UnifiedContactFormData) => {
    if (!currentTenant || !user) return;

    setLoading(true);
    try {
      // Check for duplicates
      const phone = formatPhone(data.country_code, data.phone_number);
      const duplicateCheck = await checkForDuplicates(data.email || undefined, phone || undefined);

      if (duplicateCheck) {
        setDuplicateInfo(duplicateCheck);
        setShowDuplicateDialog(true);
        setLoading(false);
        return;
      }

      await createContact(data);
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to create contact',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createContact = async (data: UnifiedContactFormData) => {
    if (!currentTenant || !user) return;

    try {
      const contactData = {
        first_name: data.first_name.trim(),
        last_name: data.last_name?.trim() || null,
        email: data.email?.trim() || null,
        country_code: data.country_code || null,
        phone_number: data.phone_number?.trim() || null,
        position: data.position?.trim() || null,
        tenant_id: currentTenant.id,
        active: true,
      };

      const { data: insertedContact, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select('id, first_name, last_name, email')
        .single();

      if (error) throw error;

      // Link to company if selected
      if (data.company_id && includeCompanyField) {
        await supabase
          .from('company_contacts')
          .insert({
            company_id: data.company_id,
            contact_id: insertedContact.id,
            is_primary: false,
            position: data.position || null,
          });
      }

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          entity_id: insertedContact.id,
          entity_type: 'contact',
          activity_type: 'contact_created',
          title: 'Contact Created',
          description: `Contact "${data.first_name} ${data.last_name || ''}" was created`,
          created_by: user.id,
          tenant_id: currentTenant.id,
        });

      toast({
        title: 'Success',
        description: `Contact ${data.first_name} ${data.last_name || ''} created successfully`,
      });

      onContactCreated(insertedContact);
      handleClose();
    } catch (error: any) {
      throw error;
    }
  };

  const handleUseExisting = () => {
    if (duplicateInfo) {
      onContactCreated({
        id: duplicateInfo.contact.id,
        first_name: duplicateInfo.contact.first_name,
        last_name: duplicateInfo.contact.last_name,
        email: duplicateInfo.contact.email,
      });
      handleClose();
    }
  };

  const handleGoBackAndEdit = () => {
    setShowDuplicateDialog(false);
    setDuplicateInfo(null);
  };

  const handleCompanyCreated = (company: { id: string; name: string }) => {
    form.setValue('company_id', company.id);
    setCompanySearch(company.name);
    setCompanyOpen(false);
    searchCompanies(companySearch);
  };

  const getSelectedCompany = () => {
    const companyId = form.watch('company_id');
    return companies.find(c => c.id === companyId);
  };

  const handleClose = () => {
    form.reset();
    setDuplicateInfo(null);
    setShowDuplicateDialog(false);
    setCompanySearch('');
    if (currentTenant?.country) {
      const countryCode = getCountryCodeForCountry(currentTenant.country);
      form.setValue('country_code', countryCode);
    }
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showDuplicateDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {title}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={{
                          countryCode: field.value || tenantCountryCode,
                          phoneNumber: form.watch('phone_number') || ''
                        }}
                        onChange={(phoneData) => {
                          form.setValue('country_code', phoneData.countryCode);
                          form.setValue('phone_number', phoneData.phoneNumber);
                        }}
                        placeholder="Enter phone number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {includePosition && (
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter position/title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {includeCompanyField && (
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={companyOpen}
                        className="w-full justify-between"
                      >
                        {getSelectedCompany() ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span className="truncate">{getSelectedCompany()?.name}</span>
                          </div>
                        ) : (
                          "Search companies..."
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="p-2">
                        <Input
                          placeholder="Search companies..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      <ScrollArea className="max-h-60">
                        {companies.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            No companies found
                          </div>
                        ) : (
                          <div className="p-1">
                            {companies.map((company) => (
                              <Button
                                key={company.id}
                                variant="ghost"
                                className="w-full justify-start h-auto p-2"
                                onClick={() => {
                                  form.setValue('company_id', company.id);
                                  setCompanySearch(company.name);
                                  setCompanyOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Building className="h-4 w-4" />
                                  <div className="flex-1 text-left">
                                    <div className="font-medium">{company.name}</div>
                                    {company.email && (
                                      <div className="text-xs text-muted-foreground">
                                        {company.email}
                                      </div>
                                    )}
                                  </div>
                                  {company.id === form.watch('company_id') && (
                                    <Check className="h-4 w-4" />
                                  )}
                                </div>
                              </Button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                      <div className="p-2 border-t">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setShowCompanyModal(true);
                            setCompanyOpen(false);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Quick Add Company
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Contact'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Duplicate Detection Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={() => setShowDuplicateDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Contact Already Exists
            </DialogTitle>
          </DialogHeader>
          
          {duplicateInfo && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  A contact already exists with this {duplicateInfo.matchType}:
                  <br />
                  <strong>
                    {duplicateInfo.contact.first_name} {duplicateInfo.contact.last_name}
                  </strong>
                  <br />
                  {duplicateInfo.matchType === 'email' ? (
                    <span className="text-sm">Email: {duplicateInfo.contact.email}</span>
                  ) : (
                    <span className="text-sm">
                      Phone: {duplicateInfo.contact.country_code}{duplicateInfo.contact.phone_number}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button onClick={handleUseExisting} className="w-full">
                  <Check className="h-4 w-4 mr-2" />
                  Use Existing Contact
                </Button>
                <Button variant="outline" onClick={handleGoBackAndEdit} className="w-full">
                  Go Back & Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Add Company Modal */}
      <QuickAddCompanyModal
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onCompanyCreated={handleCompanyCreated}
      />
    </>
  );
};