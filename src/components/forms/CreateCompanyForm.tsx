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

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  headquarters: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CreateCompanyFormProps {
  isLead?: boolean;
  onSuccess?: (id: string) => void;
}

export const CreateCompanyForm = ({ isLead = false, onSuccess }: CreateCompanyFormProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      website: '',
      industry: '',
      size: '',
      headquarters: '',
      description: '',
      notes: '',
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    if (!currentTenant || !user) return;

    setIsSubmitting(true);
    try {
      const { data: company, error } = await supabase
        .from('companies')
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
          entity_id: company.id,
          entity_type: 'company',
          activity_type: isLead ? 'lead_created' : 'company_created',
          title: isLead ? 'Lead Created' : 'Company Created',
          description: `${isLead ? 'Company lead' : 'Company'} "${data.name}" was created`,
          created_by: user.id,
          tenant_id: currentTenant.id,
        });

      toast({
        title: 'Success',
        description: `${isLead ? 'Company lead' : 'Company'} created successfully`,
      });

      if (onSuccess) {
        onSuccess(company.id);
      } else {
        navigate(isLead ? `/leads/company/${company.id}` : '/companies');
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
        <CardTitle>{isLead ? 'Create Company Lead' : 'Create Company'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Size</FormLabel>
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
              name="headquarters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Headquarters</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
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
                {isSubmitting ? 'Creating...' : `Create ${isLead ? 'Lead' : 'Company'}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isLead ? '/leads' : '/companies')}
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