import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { validateSiteData } from '@/lib/site-validation';
import { MapPin, Building, User, Upload, Download, FileSpreadsheet, Plus, Camera, X } from 'lucide-react';
import { parseSiteCSV, importSites, downloadSiteTemplate } from '@/lib/site-import';

// GCC Countries list
const GCC_COUNTRIES = [
  'Saudi Arabia',
  'United Arab Emirates',
  'Kuwait',
  'Qatar',
  'Bahrain',
  'Oman'
];

const siteSchema = z.object({
  name: z.string().min(2, 'Site name must be at least 2 characters'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  postal_code: z.string().optional(),
  customer_id: z.string().optional(),
  contact_id: z.string().optional(),
  company_id: z.string().optional(),
  is_lead: z.boolean(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().optional(),
});

type SiteFormData = z.infer<typeof siteSchema>;

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

interface Company {
  id: string;
  name: string;
}

const AddSite = () => {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  const form = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postal_code: '',
      customer_id: undefined,
      contact_id: undefined,
      company_id: undefined,
      is_lead: false,
      latitude: undefined,
      longitude: undefined,
      notes: '',
    },
  });

  const fetchData = async () => {
    if (!currentTenant) return;

    try {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('first_name');

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTenant]);

  const uploadImages = async (): Promise<string[]> => {
    if (!currentTenant || uploadedImages.length === 0) return [];
    
    const imageUrls: string[] = [];
    
    for (const file of uploadedImages) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTenant.id}/${Date.now()}-${Math.random()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('site-images')
        .upload(fileName, file);
      
      if (error) {
        console.error('Error uploading image:', error);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('site-images')
        .getPublicUrl(fileName);
      
      imageUrls.push(publicUrl);
    }
    
    return imageUrls;
  };

  const onSubmit = async (data: SiteFormData) => {
    if (!currentTenant) {
      toast.error('No tenant selected');
      return;
    }

    setLoading(true);
    try {
      // Client-side validation
      const validationErrors = await validateSiteData(data, currentTenant.id);
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
          form.setError(error.field as keyof SiteFormData, {
            type: 'manual',
            message: error.message
          });
        });
        setLoading(false);
        return;
      }

      // Upload images
      const imageUrls = await uploadImages();

      // Prepare data for submission
      const submitData = {
        ...data,
        customer_id: data.customer_id === 'none' ? null : data.customer_id,
        contact_id: data.contact_id === 'none' ? null : data.contact_id,
        company_id: data.company_id === 'none' ? null : data.company_id,
        images: imageUrls.length > 0 ? imageUrls : null,
        tenant_id: currentTenant.id,
        active: true
      };

      // Create site
      const { data: siteData, error } = await supabase
        .from('sites')
        .insert(submitData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Site created successfully');
      navigate('/sites');
    } catch (error: any) {
      console.error('Error creating site:', error);
      if (error.code === '23505') {
        form.setError('name', {
          type: 'manual',
          message: 'A site with this name already exists'
        });
      } else {
        toast.error('Failed to create site');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTenant) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const sites = parseSiteCSV(text);
      
      if (sites.length === 0) {
        toast.error('No valid sites found in the file');
        setImporting(false);
        return;
      }

      const result = await importSites(sites, currentTenant.id, 'user-id'); // TODO: Get actual user ID

      if (result.success && result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} sites`);
        navigate('/sites');
      } else if (result.errors.length > 0) {
        const errorMessage = `Import completed with errors. ${result.imported} sites imported, ${result.errors.length} errors.`;
        toast.error(errorMessage);
        console.log('Import errors:', result.errors);
      }
    } catch (error) {
      console.error('Error importing sites:', error);
      toast.error('Failed to import sites');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast.error('Please select only image files');
      return;
    }
    
    setUploadedImages(prev => [...prev, ...imageFiles]);
    event.target.value = ''; // Reset input
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Add New Site</h1>
            <p className="text-muted-foreground">
              Create a new site location for your organization
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={downloadSiteTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={importing}
              />
              <Button variant="outline" disabled={importing}>
                <Upload className="mr-2 h-4 w-4" />
                {importing ? 'Importing...' : 'Import CSV'}
              </Button>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter site name" {...field} />
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
                        <FormLabel>Customer (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No customer</SelectItem>
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

                  <FormField
                    control={form.control}
                    name="contact_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          Contact (Optional)
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/contacts/add')}
                            className="flex items-center gap-1 h-6 px-2"
                          >
                            <Plus className="h-3 w-3" />
                            Add Contact
                          </Button>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a contact" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No contact</SelectItem>
                            {contacts.map((contact) => (
                              <SelectItem key={contact.id} value={contact.id}>
                                {contact.first_name} {contact.last_name}
                                {contact.email && ` (${contact.email})`}
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
                    name="company_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          Company (Optional)
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/companies/add')}
                            className="flex items-center gap-1 h-6 px-2"
                          >
                            <Plus className="h-3 w-3" />
                            Add Company
                          </Button>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a company" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No company</SelectItem>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
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
                            Mark this site as a potential business lead
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Location Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                            <Input placeholder="State/Province" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <FormField
                       control={form.control}
                       name="country"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Country *</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                             <FormControl>
                               <SelectTrigger>
                                 <SelectValue placeholder="Select a country" />
                               </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                               {GCC_COUNTRIES.map((country) => (
                                 <SelectItem key={country} value={country}>
                                   {country}
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
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Postal Code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coordinates and Notes */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Coordinates (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="any"
                              placeholder="40.7128" 
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
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="any"
                              placeholder="-74.0060" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                   <CardTitle>Site Images</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                     <div className="flex items-center gap-2 mb-4">
                       <div className="relative">
                         <input
                           type="file"
                           accept="image/*"
                           multiple
                           onChange={handleImageUpload}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                         />
                         <Button variant="outline" type="button">
                           <Camera className="mr-2 h-4 w-4" />
                           Attach Pictures
                         </Button>
                       </div>
                       <span className="text-sm text-muted-foreground">
                         Upload images of the site
                       </span>
                     </div>
                     
                     {uploadedImages.length > 0 && (
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         {uploadedImages.map((file, index) => (
                           <div key={index} className="relative group">
                             <img
                               src={URL.createObjectURL(file)}
                               alt={`Site image ${index + 1}`}
                               className="w-full h-24 object-cover rounded-md border"
                             />
                             <Button
                               type="button"
                               variant="destructive"
                               size="sm"
                               className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                               onClick={() => removeImage(index)}
                             >
                               <X className="h-3 w-3" />
                             </Button>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
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
                            placeholder="Add any additional notes about this site..."
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
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/sites')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Site'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
};

export default AddSite;