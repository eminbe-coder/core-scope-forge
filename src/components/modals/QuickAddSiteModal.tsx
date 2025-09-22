import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { MapPin } from 'lucide-react';

// GCC Countries list
const GCC_COUNTRIES = [
  'Saudi Arabia',
  'United Arab Emirates',
  'Kuwait',
  'Qatar',
  'Bahrain',
  'Oman'
];

const quickSiteSchema = z.object({
  name: z.string().min(2, 'Site name must be at least 2 characters'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
});

type QuickSiteFormData = z.infer<typeof quickSiteSchema>;

interface QuickAddSiteModalProps {
  open: boolean;
  onClose: () => void;
  onSiteCreated: (site: { id: string; name: string }) => void;
}

export const QuickAddSiteModal = ({ open, onClose, onSiteCreated }: QuickAddSiteModalProps) => {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);

  const form = useForm<QuickSiteFormData>({
    resolver: zodResolver(quickSiteSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      country: '',
    },
  });

  const onSubmit = async (data: QuickSiteFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      const siteData = {
        name: data.name.trim(),
        address: data.address.trim(),
        city: data.city?.trim() || null,
        country: data.country,
        tenant_id: currentTenant.id,
        active: true,
      };

      const { data: insertedSite, error } = await supabase
        .from('sites')
        .insert([siteData])
        .select('id, name')
        .single();

      if (error) throw error;

      toast.success(`Site ${data.name} created successfully`);
      onSiteCreated(insertedSite);
      form.reset();
      onClose();
    } catch (error: any) {
      console.error('Error creating site:', error);
      
      // Parse specific error types and provide detailed messages
      if (error.code === '23505') {
        if (error.message.includes('sites_name_tenant_id_key')) {
          form.setError('name', { message: 'A site with this name already exists in this tenant' });
        } else {
          form.setError('name', { message: 'A site with this name already exists' });
        }
      } else if (error.code === '23502') {
        // Not null constraint violation
        const field = error.message.match(/column "(\w+)"/)?.[1];
        if (field === 'tenant_id') {
          toast.error('Authentication error: Please log out and log back in');
        } else if (field === 'name') {
          form.setError('name', { message: 'Site name is required' });
        } else if (field === 'address') {
          form.setError('address', { message: 'Address is required' });
        } else if (field === 'country') {
          form.setError('country', { message: 'Country is required' });
        } else {
          toast.error(`Missing required field: ${field}`);
        }
      } else if (error.code === '42501') {
        toast.error('Permission denied: You do not have access to create sites for this tenant');
      } else if (error.code === '23514') {
        // Check constraint violation
        toast.error('Invalid data provided. Please check all fields and try again');
      } else if (error.message?.includes('JWT')) {
        toast.error('Session expired. Please refresh the page and try again');
      } else if (error.message?.includes('Network')) {
        toast.error('Network error. Please check your connection and try again');
      } else {
        // Provide more context for generic errors
        const errorMessage = error.message || 'Unknown error occurred';
        toast.error(`Failed to create site: ${errorMessage}`);
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
            <MapPin className="h-5 w-5" />
            Quick Add Site
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter street address" {...field} />
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
                    <Input placeholder="Enter city" {...field} />
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
                  <FormLabel>Country *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Site'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};