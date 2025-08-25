import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Download, User, Mail, FileText, Users, Phone, MapPin, Building2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  position: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  customer_id: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface Customer {
  id: string;
  name: string;
}

const AddContact = () => {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

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
    },
  });

  useEffect(() => {
    fetchCustomers();
  }, [currentTenant]);

  const fetchCustomers = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const validateEmailUnique = async (email: string): Promise<boolean> => {
    if (!currentTenant || !email) return true;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', email)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      if (error) throw error;
      return !data || data.length === 0;
    } catch (error) {
      console.error('Error validating email:', error);
      return false;
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      // Validate email uniqueness
      const isEmailUnique = await validateEmailUnique(data.email);
      if (!isEmailUnique) {
        form.setError('email', { message: 'This email is already used by another contact' });
        setLoading(false);
        return;
      }

      const contactData = {
        ...data,
        tenant_id: currentTenant.id,
        customer_id: data.customer_id || null,
      };

      const { error } = await supabase
        .from('contacts')
        .insert([contactData]);

      if (error) throw error;

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
    // Create sample Excel data
    const headers = ['First Name*', 'Last Name*', 'Email*', 'Phone', 'Job Title', 'Company', 'Address', 'Notes'];
    const sampleData = [
      ['John', 'Doe', 'john.doe@example.com', '+1234567890', 'Software Engineer', 'Tech Corp', '123 Main St, City, State', 'Sample notes'],
      ['Jane', 'Smith', 'jane.smith@example.com', '+0987654321', 'Project Manager', 'Business Inc', '456 Oak Ave, City, State', ''],
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
                          <FormLabel>Last Name *</FormLabel>
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
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
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
                            <Input placeholder="Enter phone number" {...field} />
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
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a company" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Address and Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
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
      </div>
    </DashboardLayout>
  );
};

export default AddContact;