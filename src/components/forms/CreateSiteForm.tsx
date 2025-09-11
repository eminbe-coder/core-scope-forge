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
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { CompanyRelationshipSelector, CompanyRelationship } from '@/components/forms/CompanyRelationshipSelector';
import { saveEntityRelationships } from '@/utils/entity-relationships';
import { EnhancedSourceSelect, SourceValues } from '@/components/ui/enhanced-source-select';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { SolutionCategorySelect } from '@/components/ui/solution-category-select';

const siteSchema = z.object({
  name: z.string().min(1, 'Site name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  stage_id: z.string().optional(),
  quality_id: z.string().optional(),
  solution_category_ids: z.array(z.string()).optional(),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface CreateSiteFormProps {
  isLead?: boolean;
  createMode?: 'new' | 'existing';
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

export const CreateSiteForm = ({ isLead = false, createMode = 'new', onSuccess }: CreateSiteFormProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyRelationships, setCompanyRelationships] = useState<CompanyRelationship[]>([]);
  const [leadStages, setLeadStages] = useState<LeadStage[]>([]);
  const [leadQualities, setLeadQualities] = useState<LeadQuality[]>([]);
  const [defaultQualityId, setDefaultQualityId] = useState<string | null>(null);
  const [existingSites, setExistingSites] = useState<Array<{ id: string; name: string; address: string }>>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [sourceValues, setSourceValues] = useState<SourceValues>({
    sourceCategory: '',
    companySource: '',
    contactSource: '',
  });

  const form = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      notes: '',
      stage_id: '',
      quality_id: '',
      solution_category_ids: [],
    },
  });

  useEffect(() => {
    if (currentTenant) {
      if (isLead) {
        loadLeadOptions();
      }
      if (createMode === 'existing') {
        loadExistingSites();
      }
    }
  }, [isLead, createMode, currentTenant]);

  const loadExistingSites = async () => {
    if (!currentTenant) return;
    
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, address')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setExistingSites(data || []);
    } catch (error) {
      console.error('Error loading existing sites:', error);
      toast({
        title: 'Error',
        description: 'Failed to load existing sites',
        variant: 'destructive',
      });
    }
  };

  const loadLeadOptions = async () => {
    if (!currentTenant) return;

    try {
      const [stagesResult, qualitiesResult, tenantResult] = await Promise.all([
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
          .from('tenants')
          .select('default_lead_quality_id')
          .eq('id', currentTenant.id)
          .single()
      ]);

      if (stagesResult.data) setLeadStages(stagesResult.data);
      if (qualitiesResult.data) setLeadQualities(qualitiesResult.data);
      
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

  const handleExistingSiteSubmit = async () => {
    if (!selectedSiteId || !currentTenant || !user) return;

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
      // Update the existing site to become a lead
      const { error } = await supabase
        .from('sites')
        .update({
          is_lead: true,
          high_value: false,
          source_id: sourceValues.sourceCategory || null,
          source_company_id: sourceValues.companySource || null,
          source_contact_id: sourceValues.contactSource || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedSiteId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Site converted to lead successfully',
      });

      if (onSuccess) {
        onSuccess(selectedSiteId);
      } else {
        navigate('/leads');
      }
    } catch (error) {
      console.error('Error converting site to lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to convert site to lead',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: SiteFormData) => {
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
      const { data: site, error } = await supabase
        .from('sites')
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
          solution_category_ids: data.solution_category_ids || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Save company relationships
      if (companyRelationships.length > 0) {
        const entityType = isLead ? 'lead_site' : 'site';
        await saveEntityRelationships(entityType, site.id, companyRelationships, currentTenant.id);
      }

      // Log activity
      await supabase
        .from('activity_logs')
        .insert({
          entity_id: site.id,
          entity_type: 'site',
          activity_type: isLead ? 'lead_created' : 'site_created',
          title: isLead ? 'Lead Created' : 'Site Created',
          description: `${isLead ? 'Site lead' : 'Site'} "${data.name}" was created`,
          created_by: user.id,
          tenant_id: currentTenant.id,
        });

      toast({
        title: 'Success',
        description: `${isLead ? 'Site lead' : 'Site'} created successfully`,
      });

      if (onSuccess) {
        onSuccess(site.id);
      } else {
        navigate(isLead ? `/leads/site/${site.id}` : '/sites');
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
        <CardTitle>
          {createMode === 'existing' 
            ? 'Select Existing Site for Lead' 
            : (isLead ? 'Create Site Lead' : 'Create Site')
          }
        </CardTitle>
      </CardHeader>
      <CardContent>
        {createMode === 'existing' ? (
          <div className="space-y-6">
            <div>
              <Label>Select Site</Label>
              <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an existing site" />
                </SelectTrigger>
                <SelectContent>
                  {existingSites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      <div>
                        <div className="font-medium">{site.name}</div>
                        <div className="text-sm text-muted-foreground">{site.address}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLead && selectedSiteId && (
              <div className="space-y-4">
                <Label>Site Lead Sources</Label>
                <EnhancedSourceSelect
                  value={sourceValues}
                  onValueChange={setSourceValues}
                />
                <p className="text-sm text-muted-foreground">
                  At least one source field (Category, Company, or Contact) must be filled.
                </p>
              </div>
            )}

            <Button 
              onClick={handleExistingSiteSubmit}
              disabled={!selectedSiteId || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Converting...' : 'Convert to Lead'}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
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
                      <Input {...field} />
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
                <Label>Site Lead Sources</Label>
                <EnhancedSourceSelect
                  value={sourceValues}
                  onValueChange={setSourceValues}
                />
                <p className="text-sm text-muted-foreground">
                  At least one source field (Category, Company, or Contact) must be filled.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                         {...field}
                         onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                       />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </div>

             {/* Company Relationships */}
             <CompanyRelationshipSelector
               relationships={companyRelationships}
               onChange={setCompanyRelationships}
               title="Company Relationships"
               description="Link companies with specific roles (e.g., Consultant, Contractor, etc.)"
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

            {isLead && (
              <FormField
                control={form.control}
                name="solution_category_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Solution Categories</FormLabel>
                    <FormControl>
                      <SolutionCategorySelect
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select solution categories..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : `Create ${isLead ? 'Lead' : 'Site'}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isLead ? '/leads' : '/sites')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
        )}
      </CardContent>
    </Card>
  );
};