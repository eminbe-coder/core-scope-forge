import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  position: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface CreateContactFormProps {
  isLead?: boolean;
  onSuccess?: (id: string) => void;
}

export const CreateContactForm = ({ isLead = false, onSuccess }: CreateContactFormProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    if (!currentTenant || !user) return;

    setIsSubmitting(true);
    try {
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          ...data,
          is_lead: isLead,
          tenant_id: currentTenant.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          entity_id: contact.id,
          entity_type: 'contact',
          activity_type: isLead ? 'lead_created' : 'contact_created',
          title: isLead ? 'Lead Created' : 'Contact Created',
          description: `${isLead ? 'Lead' : 'Contact'} "${data.first_name} ${data.last_name || ''}" was created`,
          created_by: user.id,
          tenant_id: currentTenant.id,
        });

      toast({
        title: 'Success',
        description: `${isLead ? 'Lead' : 'Contact'} created successfully`,
      });

      if (onSuccess) {
        onSuccess(contact.id);
      } else {
        navigate(isLead ? `/leads/contact/${contact.id}` : '/contacts');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isLead ? 'Create Contact Lead' : 'Create Contact'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
                      <Input type="email" {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : `Create ${isLead ? 'Lead' : 'Contact'}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isLead ? '/leads' : '/contacts')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};