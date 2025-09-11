import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedSourceSelect, SourceValues } from '@/components/ui/enhanced-source-select';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { CompanyRelationshipSelector, CompanyRelationship } from '@/components/forms/CompanyRelationshipSelector';
import { saveEntityRelationships } from '@/utils/entity-relationships';
import { useNavigate } from 'react-router-dom';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  country_code: z.string().optional(),
  phone_number: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  headquarters: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  stage_id: z.string().optional(),
  quality_id: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CreateCompanyFormProps {
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

export const CreateCompanyForm = ({ isLead = false, onSuccess }: CreateCompanyFormProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyRelationships, setCompanyRelationships] = useState<CompanyRelationship[]>([]);
  const [leadStages, setLeadStages] = useState<LeadStage[]>([]);
  const [leadQualities, setLeadQualities] = useState<LeadQuality[]>([]);
  const [dealSources, setDealSources] = useState<Array<{ id: string; name: string }>>([]);
  const [defaultQualityId, setDefaultQualityId] = useState<string | null>(null);
  const [sourceValues, setSourceValues] = useState<SourceValues>({
    sourceCategory: '',
    companySource: '',
    contactSource: '',
  });

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      email: '',
      country_code: '',
      phone_number: '',
      website: '',
      industry: '',
      size: '',
      headquarters: '',
      description: '',
      notes: '',
      stage_id: '',
      quality_id: '',
    },
  });

  useEffect(() => {
    if (isLead && currentTenant) {
      loadLeadOptions();
    }
  }, [isLead, currentTenant]);

  const loadLeadOptions = async () => {
    if (!currentTenant) return;

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

      if (stagesResult.data) setLeadStages(stagesResult.data);
      if (qualitiesResult.data) setLeadQualities(qualitiesResult.data);
      if (sourcesResult.data) setDealSources(sourcesResult.data);
      
      if (tenantResult.data?.default_lead_quality_id) {
        setDefaultQualityId(tenantResult.data.default_lead_quality_id);
        // Set default quality if not already set
        if (!form.getValues('quality_id')) {
          form.setValue('quality_id', tenantResult.data.default_lead_quality_id);
        }
      }
    } catch (error) {
      console.error('Error loading lead options:', error);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    if (!currentTenant || !user) return;

    // Validate source fields for leads
    if (isLead) {
      const hasSourceCategory = sourceValues.sourceCategory && sourceValues.sourceCategory.length > 0;
      const hasCompanySource = sourceValues.companySource && sourceValues.companySource.length > 0;
      const hasContactSource = sourceValues.contactSource && sourceValues.contactSource.length > 0;
      
      if (!hasSourceCategory && !hasCompanySource && !hasContactSource) {
        toast({
          title: 'Validation Error',
          description: 'At least one source field (Category, Company, or Contact) must be filled for leads',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .insert({
          ...data,
          is_lead: isLead,
          tenant_id: currentTenant.id,
          stage_id: data.stage_id || null,
          quality_id: data.quality_id || null,
          source_id: sourceValues.sourceCategory || null,
          source_company_id: sourceValues.companySource || null,
          source_contact_id: sourceValues.contactSource || null,
          source_user_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      // Save company relationships
      if (companyRelationships.length > 0) {
        const entityType = isLead ? 'lead_company' : 'company';
        await saveEntityRelationships(entityType, company.id, companyRelationships, currentTenant.id);
      }

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
                name="country_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={{
                          countryCode: field.value || '',
                          phoneNumber: form.watch('phone_number') || ''
                        }}
                        onChange={(phoneData) => {
                          form.setValue('country_code', phoneData.countryCode);
                          form.setValue('phone_number', phoneData.phoneNumber);
                        }}
                        placeholder="Enter phone number"
                      />
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

              {isLead && (
                <>
                  <FormField
                    control={form.control}
                    name="stage_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Stage</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            {isLead && (
              <div className="space-y-4">
                <Label>Company Lead Sources</Label>
                <EnhancedSourceSelect
                  value={sourceValues}
                  onValueChange={setSourceValues}
                />
                <p className="text-sm text-muted-foreground">
                  At least one source field (Category, Company, or Contact) must be filled.
                </p>
              </div>
            )}

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

            {/* Company Relationships */}
            <CompanyRelationshipSelector
              relationships={companyRelationships}
              onChange={setCompanyRelationships}
              title="Company Relationships"
              description="Link other companies with specific roles (e.g., Parent Company, Partner, etc.)"
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