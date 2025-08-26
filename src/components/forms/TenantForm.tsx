import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const tenantSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'),
  domain: z.string().optional(),
  company_location: z.string().optional(),
  cr_number: z.string().optional(),
  tax_number: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  default_currency_id: z.string().optional(),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  company_location?: string;
  cr_number?: string;
  tax_number?: string;
  contact_email?: string;
  contact_phone?: string;
  default_currency_id?: string;
}

interface TenantFormProps {
  tenant?: TenantData;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TenantForm({ tenant, onSuccess, onCancel }: TenantFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currencies, setCurrencies] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const { toast } = useToast();
  const isEditing = !!tenant;

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: tenant?.name || '',
      slug: tenant?.slug || '',
      domain: tenant?.domain || '',
      company_location: tenant?.company_location || '',
      cr_number: tenant?.cr_number || '',
      tax_number: tenant?.tax_number || '',
      contact_email: tenant?.contact_email || '',
      contact_phone: tenant?.contact_phone || '',
      default_currency_id: tenant?.default_currency_id || '',
    },
  });

  // Load currencies on mount
  useEffect(() => {
    const loadCurrencies = async () => {
      const { data } = await supabase.from('currencies').select('id, code, name').eq('active', true);
      if (data) setCurrencies(data);
    };
    loadCurrencies();
  }, []);

  const onSubmit = async (data: TenantFormData) => {
    setIsLoading(true);
    try {
      const tenantData = {
        name: data.name,
        slug: data.slug,
        domain: data.domain || null,
        company_location: data.company_location || null,
        cr_number: data.cr_number || null,
        tax_number: data.tax_number || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        default_currency_id: data.default_currency_id || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('tenants')
          .update(tenantData)
          .eq('id', tenant.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenants')
          .insert([{ ...tenantData, active: true }]);
        
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Tenant ${isEditing ? 'updated' : 'created'} successfully`,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} tenant`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate slug from name (only for new tenants)
  const handleNameChange = (value: string) => {
    form.setValue('name', value);
    if (!isEditing) {
      const slug = value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
      form.setValue('slug', slug);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter company name" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="company-slug" 
                  disabled={isEditing}
                />
              </FormControl>
              <FormMessage />
              {isEditing && (
                <p className="text-sm text-muted-foreground">
                  Slug cannot be changed after creation
                </p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domain (optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="company.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="City, Country" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cr_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CR Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Commercial registration number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tax_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Tax identification number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="contact@company.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+1 (555) 123-4567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="default_currency_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Currency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default currency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.code} - {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Tenant' : 'Create Tenant')}
          </Button>
        </div>
      </form>
    </Form>
  );
}