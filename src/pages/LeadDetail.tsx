import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Building2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { LeadActivities } from '@/components/lead-activities/LeadActivities';

interface Lead {
  id: string;
  name: string;
  type: 'contact' | 'company' | 'site';
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  position?: string;
  industry?: string;
  first_name?: string;
  last_name?: string;
  size?: string;
  headquarters?: string;
  description?: string;
  notes?: string;
  stage_id?: string;
  quality_id?: string;
  stage_name?: string;
  quality_name?: string;
  created_at: string;
  updated_at: string;
}

const LeadDetail = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLead = async () => {
    if (!id || !type || !currentTenant) return;

    setLoading(true);
    try {
      // Fetch stages and qualities maps
      const [stagesResult, qualitiesResult] = await Promise.all([
        supabase
          .from('lead_stages')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true),
        supabase
          .from('lead_quality')
          .select('id, name')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
      ]);

      const stagesMap = new Map(stagesResult.data?.map(s => [s.id, s.name]) || []);
      const qualitiesMap = new Map(qualitiesResult.data?.map(q => [q.id, q.name]) || []);

      let leadData: any = null;

      if (type === 'contact') {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, position, address, notes, stage_id, quality_id, created_at, updated_at')
          .eq('id', id)
          .eq('is_lead', true)
          .eq('active', true)
          .eq('tenant_id', currentTenant.id)
          .single();
        
        if (error) throw error;
        if (data) {
          leadData = {
            id: data.id,
            name: `${data.first_name} ${data.last_name || ''}`.trim(),
            type: 'contact' as const,
            email: data.email,
            phone: data.phone,
            position: data.position,
            address: data.address,
            notes: data.notes,
            first_name: data.first_name,
            last_name: data.last_name,
            stage_id: data.stage_id,
            quality_id: data.quality_id,
            stage_name: data.stage_id ? stagesMap.get(data.stage_id) : undefined,
            quality_name: data.quality_id ? qualitiesMap.get(data.quality_id) : undefined,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      } else if (type === 'company') {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, email, phone, website, headquarters, industry, size, description, notes, stage_id, quality_id, created_at, updated_at')
          .eq('id', id)
          .eq('is_lead', true)
          .eq('active', true)
          .eq('tenant_id', currentTenant.id)
          .single();
        
        if (error) throw error;
        if (data) {
          leadData = {
            id: data.id,
            name: data.name,
            type: 'company' as const,
            email: data.email,
            phone: data.phone,
            website: data.website,
            address: data.headquarters,
            headquarters: data.headquarters,
            industry: data.industry,
            size: data.size,
            description: data.description,
            notes: data.notes,
            stage_id: data.stage_id,
            quality_id: data.quality_id,
            stage_name: data.stage_id ? stagesMap.get(data.stage_id) : undefined,
            quality_name: data.quality_id ? qualitiesMap.get(data.quality_id) : undefined,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      } else if (type === 'site') {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name, address, city, state, country, notes, stage_id, quality_id, created_at, updated_at')
          .eq('id', id)
          .eq('is_lead', true)
          .eq('active', true)
          .eq('tenant_id', currentTenant.id)
          .single();
        
        if (error) throw error;
        if (data) {
          const fullAddress = [data.address, data.city, data.state, data.country]
            .filter(Boolean)
            .join(', ');
          
          leadData = {
            id: data.id,
            name: data.name,
            type: 'site' as const,
            address: fullAddress,
            notes: data.notes,
            stage_id: data.stage_id,
            quality_id: data.quality_id,
            stage_name: data.stage_id ? stagesMap.get(data.stage_id) : undefined,
            quality_name: data.quality_id ? qualitiesMap.get(data.quality_id) : undefined,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      }

      setLead(leadData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToDeal = () => {
    if (lead) {
      navigate(`/deals/add?leadType=${lead.type}&leadId=${lead.id}`);
    }
  };

  const getLeadIcon = (type: string) => {
    switch (type) {
      case 'contact': return User;
      case 'company': return Building2;
      case 'site': return MapPin;
      default: return User;
    }
  };

  const getLeadTypeColor = (type: string) => {
    switch (type) {
      case 'contact': return 'bg-blue-500';
      case 'company': return 'bg-green-500';
      case 'site': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id, type, currentTenant]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading lead details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Lead not found</h2>
            <p className="text-muted-foreground mb-4">The lead you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/leads')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const IconComponent = getLeadIcon(lead.type);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/leads')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${getLeadTypeColor(lead.type)}`}>
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{lead.name}</h1>
                <p className="text-muted-foreground capitalize">{lead.type} Lead</p>
              </div>
            </div>
          </div>
          <Button onClick={handleConvertToDeal}>
            <User className="h-4 w-4 mr-2" />
            Convert to Deal
          </Button>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Lead Details */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Lead Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.type === 'contact' && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                      <p className="font-medium">{lead.first_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                      <p className="font-medium">{lead.last_name}</p>
                    </div>
                    {lead.position && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Position</Label>
                        <p className="font-medium">{lead.position}</p>
                      </div>
                    )}
                  </>
                )}

                {lead.type === 'company' && (
                  <>
                    {lead.industry && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Industry</Label>
                        <p className="font-medium">{lead.industry}</p>
                      </div>
                    )}
                    {lead.size && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Company Size</Label>
                        <p className="font-medium">{lead.size}</p>
                      </div>
                    )}
                    {lead.website && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Website</Label>
                        <p className="font-medium">{lead.website}</p>
                      </div>
                    )}
                  </>
                )}

                {lead.email && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                    <p className="font-medium">{lead.email}</p>
                  </div>
                )}

                {lead.phone && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                    <p className="font-medium">{lead.phone}</p>
                  </div>
                )}

                {lead.address && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      {lead.type === 'company' ? 'Headquarters' : 'Address'}
                    </Label>
                    <p className="font-medium">{lead.address}</p>
                  </div>
                )}

                {lead.stage_name && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Stage</Label>
                    <Badge variant="outline">{lead.stage_name}</Badge>
                  </div>
                )}

                {lead.quality_name && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Quality</Label>
                    <Badge variant="outline">{lead.quality_name}</Badge>
                  </div>
                )}

                {lead.notes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                    <p className="text-sm">{lead.notes}</p>
                  </div>
                )}

                <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                  <p>Created: {new Date(lead.created_at).toLocaleDateString()}</p>
                  <p>Updated: {new Date(lead.updated_at).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Related Entities */}
          <div className="lg:col-span-2 space-y-6">
            {/* Companies Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Related Companies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Company relationships for leads coming soon...
                </p>
              </CardContent>
            </Card>

            {/* Sites Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Related Sites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Site relationships for leads coming soon...
                </p>
              </CardContent>
            </Card>

            {/* Relationships Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Relationships
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Lead relationships coming soon...
                </p>
              </CardContent>
            </Card>

            {/* Deals Widget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Related Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Deal relationships for leads coming soon...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activities Section - Full Width at Bottom */}
        <Card>
          <CardHeader>
            <CardTitle>Activities & To-Dos</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadActivities 
              entityId={lead.id} 
              entityType={lead.type} 
              entityName={lead.name} 
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default LeadDetail;