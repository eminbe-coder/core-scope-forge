import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { 
  validateCompany, 
  normalizeCompanyData, 
  INDUSTRY_OPTIONS, 
  COMPANY_TYPE_OPTIONS,
  CompanyFormData 
} from '@/lib/company-validation';
import { importCompaniesFromCSV } from '@/lib/company-import';
import { 
  ArrowLeft, Upload, Download, Building2, Mail, Phone, MapPin, 
  Globe, Users, FileText, Search, Plus 
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { QuickAddContactModal } from '@/components/modals/QuickAddContactModal';
import { QuickAddSiteModal } from '@/components/modals/QuickAddSiteModal';

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().optional(),
  companyType: z.array(z.string()).optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  instagramPage: z.string().optional(),
  linkedinPage: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
  contactIds: z.array(z.string()).optional(),
  is_lead: z.boolean(),
});

type CompanyFormSchema = z.infer<typeof companySchema>;

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  position?: string;
}

const AddCompany = () => {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactSearchOpen, setContactSearchOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);

  const form = useForm<CompanyFormSchema>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      industry: '',
      companyType: [],
      website: '',
      email: '',
      phone: '',
      instagramPage: '',
      linkedinPage: '',
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      notes: '',
      contactIds: [],
      is_lead: false,
    },
  });

  useEffect(() => {
    fetchContacts();
  }, [currentTenant]);

  const fetchContacts = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, position')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('first_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const onSubmit = async (data: CompanyFormSchema) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      // Validate company data
      const validation = await validateCompany({
        name: data.name,
        email: data.email,
        website: data.website,
        tenantId: currentTenant.id,
      });

      // Check for validation errors
      if (!validation.nameValidation.isValid) {
        form.setError('name', { message: validation.nameValidation.error || 'Name validation failed' });
        setLoading(false);
        return;
      }

      if (!validation.emailValidation.isValid) {
        form.setError('email', { message: validation.emailValidation.error || 'Email validation failed' });
        setLoading(false);
        return;
      }

      if (!validation.websiteValidation.isValid) {
        form.setError('website', { message: validation.websiteValidation.error || 'Website validation failed' });
        setLoading(false);
        return;
      }

      // Prepare company data
      const formData: CompanyFormData = {
        name: data.name,
        industry: data.industry,
        companyType: data.companyType,
        website: data.website,
        email: data.email,
        phone: data.phone,
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
          country: data.country,
          postalCode: data.postalCode,
        },
        notes: data.notes,
        contactIds: data.contactIds,
      };

      const companyData = {
        ...normalizeCompanyData(formData),
        tenant_id: currentTenant.id,
      };

      // Insert company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([companyData])
        .select('id')
        .single();

      if (companyError) {
        // Handle specific database errors
        if (companyError.code === '23505') {
          if (companyError.message.includes('name')) {
            form.setError('name', { message: 'A company with this name already exists' });
          } else {
            toast({
              title: 'Duplicate company',
              description: 'A company with these details already exists',
              variant: 'destructive',
            });
          }
          setLoading(false);
          return;
        }
        throw companyError;
      }

      // Link contacts to company if any selected
      if (selectedContacts.length > 0 && newCompany) {
        const contactLinks = selectedContacts.map(contact => ({
          company_id: newCompany.id,
          contact_id: contact.id,
          is_primary: false, // Could make the first one primary
        }));

        const { error: linkError } = await supabase
          .from('company_contacts')
          .insert(contactLinks);

        if (linkError) {
          console.error('Error linking contacts to company:', linkError);
          // Don't fail the whole operation, just warn
          toast({
            title: 'Company created successfully',
            description: 'However, there was an issue linking some contacts. You can link them manually later.',
            variant: 'default',
          });
        }
      }

      toast({
        title: 'Company created successfully',
        description: `${data.name} has been added to your companies.`,
      });

      navigate('/companies');
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast({
        title: 'Error creating company',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContactSelect = (contact: Contact) => {
    const isSelected = selectedContacts.some(c => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(prev => prev.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts(prev => [...prev, contact]);
    }
    
    // Update form value
    const contactIds = selectedContacts
      .filter(c => c.id !== contact.id || !isSelected)
      .concat(isSelected ? [] : [contact])
      .map(c => c.id);
    form.setValue('contactIds', contactIds);
  };

  const handleExcelImport = () => {
    // TODO: Implement Excel import functionality
    toast({
      title: 'Excel Import',
      description: 'Excel import functionality will be implemented soon.',
    });
  };

  const downloadSampleExcel = () => {
    // Create sample Excel data
    const headers = [
      'Company Name*', 'Industry', 'Company Type', 'Website', 'Email', 
      'Phone', 'Street', 'City', 'State', 'Country', 'Postal Code', 'Notes'
    ];
    const sampleData = [
      [
        'Tech Corp', 'Technology', 'Client', 'https://techcorp.com', 
        'info@techcorp.com', '+1234567890', '123 Tech St', 'San Francisco', 
        'CA', 'USA', '94105', 'Leading technology company'
      ],
      [
        'Business Solutions Inc', 'Consulting', 'Partner', 'businesssolutions.com', 
        'contact@businesssolutions.com', '+0987654321', '456 Business Ave', 'New York', 
        'NY', 'USA', '10001', 'Business consulting services'
      ],
    ];

    // Create CSV content
    const csvContent = [headers, ...sampleData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'companies_sample_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Sample template downloaded',
      description: 'Use this template to import your companies.',
    });
  };

  const handleCompanyTypeChange = (value: string, checked: boolean) => {
    const currentTypes = form.getValues('companyType') || [];
    if (checked) {
      form.setValue('companyType', [...currentTypes, value]);
    } else {
      form.setValue('companyType', currentTypes.filter(type => type !== value));
    }
  };

  const handleContactCreated = (contact: { id: string; first_name: string; last_name: string; email?: string }) => {
    setContacts(prev => [...prev, contact]);
    setSelectedContacts(prev => [...prev, contact]);
    const currentContactIds = form.getValues('contactIds') || [];
    form.setValue('contactIds', [...currentContactIds, contact.id]);
  };

  const handleSiteCreated = (site: { id: string; name: string }) => {
    // For now, just show a toast since companies don't directly link to sites
    // Sites can be linked through contacts
    toast({
      title: 'Site created successfully',
      description: `${site.name} has been created. You can link it to contacts later.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Company</h1>
            <p className="text-muted-foreground">
              Add a new company to your database
            </p>
          </div>
        </div>

        {/* Import Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium">Excel Import</h3>
                <p className="text-sm text-muted-foreground">
                  Upload companies from an Excel file
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadSampleExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExcelImport}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Microsoft 365</h3>
                <p className="text-sm text-muted-foreground">
                  Sync companies from your Microsoft account
                </p>
                <Button variant="outline" size="sm" disabled>
                  <Building2 className="h-4 w-4 mr-2" />
                  Sync from Microsoft
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Gmail</h3>
                <p className="text-sm text-muted-foreground">
                  Sync companies from your Gmail contacts
                </p>
                <Button variant="outline" size="sm" disabled>
                  <Mail className="h-4 w-4 mr-2" />
                  Sync from Gmail
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Manual Add Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Add Company Manually
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter company name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INDUSTRY_OPTIONS.map((industry) => (
                                <SelectItem key={industry} value={industry}>
                                  {industry}
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
                      name="companyType"
                      render={() => (
                        <FormItem>
                          <FormLabel>Company Type</FormLabel>
                          <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                            {COMPANY_TYPE_OPTIONS.map((type) => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox
                                  id={type}
                                  checked={(form.getValues('companyType') || []).includes(type)}
                                  onCheckedChange={(checked) => handleCompanyTypeChange(type, checked as boolean)}
                                />
                                <label htmlFor={type} className="text-sm font-medium">
                                  {type}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="company@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                     <FormField
                       control={form.control}
                       name="website"
                       render={({ field }) => (
                         <FormItem className="md:col-span-2">
                           <FormLabel>Website</FormLabel>
                           <FormControl>
                             <Input placeholder="https://company.com" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name="instagramPage"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Instagram Page</FormLabel>
                           <FormControl>
                             <Input placeholder="https://instagram.com/company" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />

                     <FormField
                       control={form.control}
                       name="linkedinPage"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>LinkedIn Page</FormLabel>
                           <FormControl>
                             <Input placeholder="https://linkedin.com/company/company" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Business Street" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input placeholder="State or Province" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                 {/* Contacts */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-medium flex items-center justify-between">
                     <span className="flex items-center gap-2">
                       <Users className="h-4 w-4" />
                       Contact Assignment
                     </span>
                     <div className="flex gap-2">
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => setShowContactModal(true)}
                         className="flex items-center gap-1 h-6 px-2"
                       >
                         <Plus className="h-3 w-3" />
                         Add Contact
                       </Button>
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={() => setShowSiteModal(true)}
                         className="flex items-center gap-1 h-6 px-2"
                       >
                         <Plus className="h-3 w-3" />
                         Add Site
                       </Button>
                     </div>
                   </h3>
                   
                   <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
                     <PopoverTrigger asChild>
                       <Button variant="outline" className="justify-start">
                         <Search className="h-4 w-4 mr-2" />
                         Search and select contacts...
                       </Button>
                     </PopoverTrigger>
                     <PopoverContent className="w-96 p-0">
                       <Command>
                         <CommandInput placeholder="Search contacts..." />
                         <CommandList>
                           <CommandEmpty>No contacts found.</CommandEmpty>
                           <CommandGroup>
                             {contacts.map((contact) => (
                               <CommandItem
                                 key={contact.id}
                                 onSelect={() => handleContactSelect(contact)}
                               >
                                 <div className="flex items-center space-x-2 w-full">
                                   <Checkbox
                                     checked={selectedContacts.some(c => c.id === contact.id)}
                                   />
                                   <div className="flex-1">
                                     <p className="font-medium">
                                       {contact.first_name} {contact.last_name}
                                     </p>
                                     {contact.email && (
                                       <p className="text-sm text-muted-foreground">{contact.email}</p>
                                     )}
                                     {contact.position && (
                                       <p className="text-sm text-muted-foreground">{contact.position}</p>
                                     )}
                                   </div>
                                 </div>
                               </CommandItem>
                             ))}
                           </CommandGroup>
                         </CommandList>
                       </Command>
                     </PopoverContent>
                   </Popover>

                   {/* Selected Contacts */}
                   {selectedContacts.length > 0 && (
                     <div className="space-y-2">
                       <p className="text-sm font-medium">Selected Contacts:</p>
                       <div className="flex flex-wrap gap-2">
                         {selectedContacts.map((contact) => (
                           <Badge key={contact.id} variant="secondary" className="px-3 py-1">
                             {contact.first_name} {contact.last_name}
                             <Button
                               variant="ghost"
                               size="sm"
                               className="h-4 w-4 p-0 ml-2"
                               onClick={() => handleContactSelect(contact)}
                             >
                               ×
                             </Button>
                           </Badge>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>

                 {/* Lead Flag */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-medium flex items-center gap-2">
                     <Users className="h-4 w-4" />
                     Lead Status
                   </h3>
                   <FormField
                     control={form.control}
                     name="is_lead"
                     render={({ field }) => (
                       <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                         <FormControl>
                           <Checkbox
                             checked={field.value}
                             onCheckedChange={field.onChange}
                           />
                         </FormControl>
                         <div className="space-y-1 leading-none">
                           <FormLabel>
                             Flag as Lead
                           </FormLabel>
                           <p className="text-sm text-muted-foreground">
                             Mark this company as a potential business lead
                           </p>
                         </div>
                       </FormItem>
                     )}
                   />
                 </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Information
                  </h3>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter any additional notes about this company"
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-6">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating Company...' : 'Create Company'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/companies')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Quick Add Modals */}
        <QuickAddContactModal
          open={showContactModal}
          onClose={() => setShowContactModal(false)}
          onContactCreated={handleContactCreated}
        />
        
        <QuickAddSiteModal
          open={showSiteModal}
          onClose={() => setShowSiteModal(false)}
          onSiteCreated={handleSiteCreated}
        />
      </div>
    </DashboardLayout>
  );
};

export default AddCompany;