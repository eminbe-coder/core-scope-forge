import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { Building } from 'lucide-react';

const quickCompanySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
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
  const [loading, setLoading] = useState(false);

  const form = useForm<QuickCompanyFormData>({
    resolver: zodResolver(quickCompanySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      website: '',
    },
  });

  const onSubmit = async (data: QuickCompanyFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      const companyData = {
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        website: data.website?.trim() || null,
        tenant_id: currentTenant.id,
        active: true,
      };

      const { data: insertedCompany, error } = await supabase
        .from('companies')
        .insert([companyData])
        .select('id, name')
        .single();

      if (error) throw error;

      toast.success(`Company ${data.name} created successfully`);
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