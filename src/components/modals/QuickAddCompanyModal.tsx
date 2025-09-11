import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { Building } from 'lucide-react';
import { useEntityRefresh } from '@/components/ui/entity-refresh-context';

const quickCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().min(1, 'Please select a company industry'),
  companyType: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
});

type QuickCompanyFormData = z.infer<typeof quickCompanySchema>;

interface QuickAddCompanyModalProps {
  open: boolean;
  onClose: () => void;
  onCompanyCreated: (company: { id: string; name: string }) => void;
}

export const QuickAddCompanyModal = ({ open, onClose, onCompanyCreated }: QuickAddCompanyModalProps) => {
  const { currentTenant } = useTenant();
  const { refreshEntities } = useEntityRefresh();
  const [loading, setLoading] = useState(false);
  const [industries, setIndustries] = useState<Array<{ id: string; name: string }>>([]);
  const [companyTypes, setCompanyTypes] = useState<Array<{ id: string; name: string }>>([]);

  const form = useForm<QuickCompanyFormData>({
    resolver: zodResolver(quickCompanySchema),
    defaultValues: {
      name: '',
      industry: '',
      companyType: '',
      email: '',
      phone: '',
      website: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant) return;

      try {
        // Fetch industries
        const { data: industriesData } = await supabase
          .from('company_industries')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name');

        // Fetch company types
        const { data: typesData } = await supabase
          .from('company_types')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name');

        setIndustries(industriesData || []);
        setCompanyTypes(typesData || []);
      } catch (error) {
        console.error('Error fetching company data:', error);
      }
    };

    if (open) {
      fetchData();
    }
  }, [currentTenant, open]);

  const onSubmit = async (data: QuickCompanyFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      const companyData = {
        name: data.name.trim(),
        industry: data.industry,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        website: data.website?.trim() || null,
        tenant_id: currentTenant.id,
        active: true,
      };

      // Add company type if selected and not "no-type"
      if (data.companyType && data.companyType !== 'no-type') {
        const selectedType = companyTypes.find(ct => ct.id === data.companyType);
        if (selectedType) {
          // Note: companies table doesn't have company_type field, 
          // this would need to be handled via a relationship table if needed
          // For now, we'll just create the company without the type
        }
      }

      const { data: insertedCompany, error } = await supabase
        .from('companies')
        .insert([companyData])
        .select('id, name')
        .single();

      if (error) throw error;

      toast.success(`Company ${data.name} created successfully`);
      refreshEntities('companies'); // Trigger refresh of all company selects
      onCompanyCreated(insertedCompany);
      form.reset();
      onClose();
    } catch (error: any) {
      console.error('Error creating company:', error);
      if (error.code === '23505') {
        form.setError('name', { message: 'A company with this name already exists' });
      } else {
        toast.error('Failed to create company');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Quick Add Company
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
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
                  <FormLabel>Industry *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select company industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border z-50">
                      {industries.map((industry) => (
                        <SelectItem key={industry.id} value={industry.name}>
                          {industry.name}
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select company type (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border z-50">
                      <SelectItem value="no-type">No specific type</SelectItem>
                      {companyTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
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

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter website URL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Company'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};