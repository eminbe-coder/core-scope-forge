import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DynamicCompanySelect, DynamicCustomerSelect, DynamicContactSelect, DynamicSiteSelect } from '@/components/ui/dynamic-searchable-select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { validateContactDuplicates, normalizeEmail } from '@/lib/contact-validation';
import { ArrowLeft, Upload, Download, User, Mail, FileText, Users, Phone, MapPin, Building2, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { UniversalCompanyModal } from '@/components/modals/UniversalCompanyModal';
import { UniversalSiteModal } from '@/components/modals/UniversalSiteModal';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().optional().refine((email) => {
    if (!email || email.trim() === '') return true; // Empty email is allowed
    // Basic format validation - detailed validation happens in the form submit
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, 'Please enter a valid email address'),
  phone: z.string().optional(),
  position: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  customer_id: z.string().optional(),
  site_ids: z.array(z.string()).optional(),
  is_lead: z.boolean().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface Customer {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
}

const AddContact = () => {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      address: '',
      notes: '',
      customer_id: '',
      site_ids: [],
      is_lead: false,
    },
  });

  useEffect(() => {
    fetchCustomers();
    fetchSites();
  }, [currentTenant]);

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

  const fetchSites = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      // Check for duplicates
      const duplicateCheck = await validateContactDuplicates({
        email: data.email,
        phone: data.phone,
        tenantId: currentTenant.id,
      });

      if (!duplicateCheck.isValid) {
        if (duplicateCheck.emailError) {
          form.setError('email', { message: duplicateCheck.emailError });
        }
        if (duplicateCheck.phoneError) {
          form.setError('phone', { message: duplicateCheck.phoneError });
        }
        setLoading(false);
        return;
      }

      // Prepare contact data for insertion
      const contactData = {
        first_name: data.first_name.trim(),
        last_name: data.last_name?.trim() || null,
        email: data.email ? normalizeEmail(data.email) : null,
        phone: data.phone?.trim() || null,
        position: data.position?.trim() || null,
        address: data.address?.trim() || null,
        notes: data.notes?.trim() || null,
        tenant_id: currentTenant.id,
        customer_id: data.customer_id || null,
        is_lead: data.is_lead || false,
      };

      const { data: insertedContact, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select('id')
        .single();

      if (error) {
        // Handle specific database errors
        if (error.code === '23505' && error.message.includes('contacts_email_tenant_unique')) {
          form.setError('email', { message: 'This email already exists in your contacts' });
          setLoading(false);
          return;
        }
        throw error;
      }

      // Link selected sites to the contact
      if (data.site_ids && data.site_ids.length > 0) {
        const contactSiteLinks = data.site_ids.map(siteId => ({
          contact_id: insertedContact.id,
          site_id: siteId,
        }));

        const { error: linkError } = await supabase
          .from('contact_sites')
          .insert(contactSiteLinks);

        if (linkError) {
          console.error('Error linking sites:', linkError);
          // We don't throw here as the contact was created successfully
        }
      }

      toast({
        title: 'Contact added successfully',
        description: `${data.first_name} ${data.last_name} has been added to your contacts.`,
      });

      navigate('/contacts');
    } catch (error: any) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Error adding contact',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImport = () => {
    // TODO: Implement Excel import functionality
    toast({
      title: 'Excel Import',
      description: 'Excel import functionality will be implemented soon.',
    });
  };

  const downloadSampleExcel = () => {
    // Create sample Excel data - email is now optional
    const headers = ['First Name*', 'Last Name', 'Email', 'Phone', 'Job Title', 'Company', 'Address', 'Notes', 'Is Lead'];
    const sampleData = [
      ['John', 'Doe', 'john.doe@example.com', '+1234567890', 'Software Engineer', 'Tech Corp', '123 Main St, City, State', 'Sample notes', 'true'],
      ['Jane', 'Smith', '', '+0987654321', 'Project Manager', 'Business Inc', '456 Oak Ave, City, State', 'Contact without email', 'false'],
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
    a.download = 'contacts_sample_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Sample template downloaded',
      description: 'Use this template to import your contacts.',
    });
  };

  const handleMicrosoftSync = () => {
    // TODO: Implement Microsoft 365 OAuth sync
    toast({
      title: 'Microsoft 365 Sync',
      description: 'Microsoft 365 contact sync will be implemented soon.',
    });
  };

  const handleGmailSync = () => {
    // TODO: Implement Gmail OAuth sync
    toast({
      title: 'Gmail Sync',
      description: 'Gmail contact sync will be implemented soon.',
    });
  };

  const handleCompanyCreated = (company: { id: string; name: string }) => {
    setCustomers(prev => [...prev, company]);
    form.setValue('customer_id', company.id);
  };

  const handleSiteCreated = (site: { id: string; name: string }) => {
    setSites(prev => [...prev, site]);
    const currentSiteIds = form.getValues('site_ids') || [];
    form.setValue('site_ids', [...currentSiteIds, site.id]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Contact</h1>
            <p className="text-muted-foreground">
              Add a new contact to your database
            </p>
          </div>
        </div>

        {/* Import Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium">Excel Import</h3>
                <p className="text-sm text-muted-foreground">
                  Upload contacts from an Excel file
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
                  Sync contacts from your Microsoft account
                </p>
                <Button variant="outline" size="sm" onClick={handleMicrosoftSync}>
                  <Users className="h-4 w-4 mr-2" />
                  Sync from Microsoft
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Gmail</h3>
                <p className="text-sm text-muted-foreground">
                  Sync contacts from your Gmail account
                </p>
                <Button variant="outline" size="sm" onClick={handleGmailSync}>
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
              <User className="h-5 w-5" />
              Add Contact Manually
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address (optional)" {...field} />
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
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <PhoneInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Enter phone number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Professional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Professional Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter job title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                             <DynamicCompanySelect
                               value={field.value}
                               onValueChange={field.onChange}
                               placeholder="Search and select company..."
                               searchPlaceholder="Search companies..."
                               emptyText="No companies found."
                               onAddNew={() => setShowCompanyModal(true)}
                               addNewLabel="Add Company"
                             />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                 </div>

                {/* Site Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Site Assignment
                  </h3>
                  <FormField
                    control={form.control}
                    name="site_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sites (Optional)</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value=""
                            onValueChange={(value) => {
                              const currentValues = field.value || [];
                              if (!currentValues.includes(value)) {
                                field.onChange([...currentValues, value]);
                              }
                            }}
                            options={sites}
                            placeholder="Search and select sites..."
                            searchPlaceholder="Search sites..."
                            emptyText="No sites found."
                            onAddNew={() => setShowSiteModal(true)}
                            addNewLabel="Add Site"
                          />
                        </FormControl>
                        {field.value && field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {field.value.map((siteId) => {
                              const site = sites.find(s => s.id === siteId);
                              return site ? (
                                <div
                                  key={siteId}
                                  className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1"
                                >
                                  {site.name}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      field.onChange(field.value?.filter(id => id !== siteId) || []);
                                    }}
                                    className="ml-1 text-xs hover:text-destructive"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Lead Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contact Status
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
                            Mark as Lead
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Check this box if this contact is a potential lead
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address and Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Information
                  </h3>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter address" {...field} />
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
                          <Textarea 
                            placeholder="Enter any additional notes about this contact"
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
                    {loading ? 'Adding Contact...' : 'Add Contact'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate('/contacts')}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Quick Add Modals */}
        <UniversalCompanyModal
          open={showCompanyModal}
          onClose={() => setShowCompanyModal(false)}
          onCompanyCreated={handleCompanyCreated}
        />
        
        <UniversalSiteModal
          open={showSiteModal}
          onClose={() => setShowSiteModal(false)}
          onSiteCreated={handleSiteCreated}
        />
      </div>
    </DashboardLayout>
  );
};

export default AddContact;