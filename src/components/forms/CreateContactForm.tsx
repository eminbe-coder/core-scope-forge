import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EntitySourceSelect } from '@/components/ui/entity-source-select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
  stage_id: z.string().optional(),
  quality_id: z.string().optional(),
  source_id: z.string().optional(),
  source_company_id: z.string().optional(),
  source_contact_id: z.string().optional(),
  source_user_id: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface CreateContactFormProps {
  isLead?: boolean;
  onSuccess?: (id: string) => void;
}

interface LeadStage {
  id: string;
  name: string;
}

interface LeadQuality {
  id: string;
  name: string;
}

export const CreateContactForm = ({ isLead = false, onSuccess }: CreateContactFormProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadStages, setLeadStages] = useState<Array<{ id: string; name: string }>>([]);
  const [leadQualities, setLeadQualities] = useState<Array<{ id: string; name: string }>>([]);
  const [dealSources, setDealSources] = useState<Array<{ id: string; name: string }>>([]);
  const [defaultQualityId, setDefaultQualityId] = useState<string | null>(null);
  const [sourceEntity, setSourceEntity] = useState<{type: 'company' | 'contact' | 'user'; id: string} | null>(null);

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
      stage_id: '',
      quality_id: '',
      source_id: '',
      source_company_id: '',
      source_contact_id: '',
      source_user_id: '',
    },
  });

  useEffect(() => {
    if (isLead && currentTenant) {
      // Load lead stages, qualities, and deal sources when isLead changes
      const loadLeadData = async () => {
        if (!currentTenant || !isLead) return;
        
        try {
          const [stagesResult, qualitiesResult, sourcesResult, tenantResult] = await Promise.all([
            supabase
              .from('lead_stages')
              .select('id, name')
              .eq('tenant_id', currentTenant.id)
              .eq('active', true)
              .order('sort_order'),
            supabase
              .from('lead_quality')
              .select('id, name')
              .eq('tenant_id', currentTenant.id)
              .eq('active', true)
              .order('sort_order'),
            supabase
              .from('deal_sources')
              .select('id, name')
              .eq('tenant_id', currentTenant.id)
              .eq('active', true)
              .order('sort_order'),
            supabase
              .from('tenants')
              .select('default_lead_quality_id')
              .eq('id', currentTenant.id)
              .single()
          ]);

          if (stagesResult.error) throw stagesResult.error;
          if (qualitiesResult.error) throw qualitiesResult.error;
          if (sourcesResult.error) throw sourcesResult.error;
          if (tenantResult.error) throw tenantResult.error;

          setLeadStages(stagesResult.data || []);
          setLeadQualities(qualitiesResult.data || []);
          setDealSources(sourcesResult.data || []);
          setDefaultQualityId(tenantResult.data?.default_lead_quality_id || null);
          
          // Set default quality if not already set
          if (tenantResult.data?.default_lead_quality_id && !form.getValues('quality_id')) {
            form.setValue('quality_id', tenantResult.data.default_lead_quality_id);
          }
        } catch (error) {
          console.error('Error loading lead data:', error);
          toast({
            title: 'Error',
            description: 'Failed to load lead data',
            variant: 'destructive',
          });
        }
      };

      loadLeadData();
    }
  }, [isLead, currentTenant]);

  const onSubmit = async (data: ContactFormData) => {
    if (!currentTenant || !user) return;

    setIsSubmitting(true);
    try {
      const contactData = {
        ...data,
        tenant_id: currentTenant.id,
        is_lead: isLead,
        source_company_id: sourceEntity?.type === 'company' ? sourceEntity.id : null,
        source_contact_id: sourceEntity?.type === 'contact' ? sourceEntity.id : null,
        source_user_id: sourceEntity?.type === 'user' ? sourceEntity.id : null,
      };

      const { data: contact, error } = await supabase
        .from('contacts')
        .insert(contactData)
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

              {isLead && (
                <>
                  <FormField
                    control={form.control}
                    name="stage_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Stage</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select lead stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leadStages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
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
                    name="quality_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Quality</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select lead quality" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leadQualities.map((quality) => (
                              <SelectItem key={quality.id} value={quality.id}>
                                {quality.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
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

            {isLead && (
              <>
                <FormField
                  control={form.control}
                  name="source_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dealSources.map((source) => (
                            <SelectItem key={source.id} value={source.id}>
                              {source.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <EntitySourceSelect
                  value={sourceEntity}
                  onValueChange={setSourceEntity}
                  label="Specific Source"
                />
              </>
            )}

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