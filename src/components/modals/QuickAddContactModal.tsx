import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { validateContactDuplicates, normalizeEmail } from '@/lib/contact-validation';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import { getCountryCodeForCountry } from '@/lib/country-codes';

// Phone input object schema - explicitly allows empty or valid phone numbers
const phoneInputSchema = z.object({
  countryCode: z.string(),
  phoneNumber: z.string(),
}).optional().nullable().refine(
  (val) => !val || val.phoneNumber === "" || val.phoneNumber.length >= 7,
  { message: "Invalid phone number", path: ["phoneNumber"] }
);

const quickContactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().optional(),
  phone: phoneInputSchema,
});

type QuickContactFormData = z.infer<typeof quickContactSchema>;

interface QuickAddContactModalProps {
  open: boolean;
  onClose: () => void;
  onContactCreated: (contact: { id: string; first_name: string; last_name: string; email?: string }) => void;
}

export const QuickAddContactModal = ({ open, onClose, onContactCreated }: QuickAddContactModalProps) => {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);

  // Get default country code from tenant
  const defaultCountryCode = getCountryCodeForCountry(currentTenant?.country || '');

  const form = useForm<QuickContactFormData>({
    resolver: zodResolver(quickContactSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: { countryCode: defaultCountryCode, phoneNumber: '' },
    },
  });

  // Update phone default when tenant changes
  useEffect(() => {
    if (currentTenant?.country) {
      const code = getCountryCodeForCountry(currentTenant.country);
      const currentPhone = form.getValues('phone');
      if (!currentPhone?.phoneNumber) {
        form.setValue('phone', { countryCode: code, phoneNumber: '' });
      }
    }
  }, [currentTenant?.country, form]);

  const onSubmit = async (data: QuickContactFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      // Extract phone data from the phone object
      const phoneData = data.phone || { countryCode: '', phoneNumber: '' };
      const phoneString = phoneData.phoneNumber ? `${phoneData.countryCode}${phoneData.phoneNumber}` : '';
      
      // Check for duplicates
      const duplicateCheck = await validateContactDuplicates({
        email: data.email,
        phone: phoneString || undefined,
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

      const contactData = {
        first_name: data.first_name.trim(),
        last_name: data.last_name?.trim() || null,
        email: data.email ? normalizeEmail(data.email) : null,
        country_code: phoneData.countryCode || null,
        phone_number: phoneData.phoneNumber || null,
        tenant_id: currentTenant.id,
        active: true,
      };

      const { data: insertedContact, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select('id, first_name, last_name, email')
        .single();

      if (error) throw error;

      toast.success(`Contact ${data.first_name} ${data.last_name || ''} created successfully`);
      onContactCreated(insertedContact);
      form.reset();
      onClose();
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast.error('Failed to create contact');
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
            <User className="h-5 w-5" />
            Quick Add Contact
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value || { countryCode: '', phoneNumber: '' }}
                      onChange={field.onChange}
                      placeholder="Enter phone number"
                    />
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
                {loading ? 'Creating...' : 'Create Contact'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};