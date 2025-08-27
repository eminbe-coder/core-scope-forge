import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Building2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { LeadActivities } from '@/components/lead-activities/LeadActivities';
import { LeadFiles } from '@/components/lead-files/LeadFiles';

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
      let query;
      let leadData: any = null;

      if (type === 'contact') {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, position, address')
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
            first_name: data.first_name,
            last_name: data.last_name,
          };
        }
      } else if (type === 'company') {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, email, phone, website, headquarters, industry')
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
            industry: data.industry,
          };
        }
      } else if (type === 'site') {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name, address, city, state, country')
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

  useEffect(() => {
    fetchLead();
  }, [id, type, currentTenant]);

  const getLeadIcon = (type: string) => {
    switch (type) {
      case 'contact': return User;
      case 'company': return Building2;
      case 'site': return MapPin;
      default: return User;
    }
  };

  const handleConvertToDeal = () => {
    if (lead) {
      navigate(`/deals/add?leadType=${lead.type}&leadId=${lead.id}`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div>Lead not found</div>
      </DashboardLayout>
    );
  }

  const IconComponent = getLeadIcon(lead.type);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/leads')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary">
                <IconComponent className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{lead.name}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {lead.type}
                  </Badge>
                  <span className="text-muted-foreground">Lead</span>
                </div>
              </div>
            </div>
          </div>
          <Button onClick={handleConvertToDeal}>
            Convert to Deal
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lead.email && (
                <div>
                  <span className="font-medium">Email:</span>
                  <p className="text-muted-foreground">{lead.email}</p>
                </div>
              )}
              {lead.phone && (
                <div>
                  <span className="font-medium">Phone:</span>
                  <p className="text-muted-foreground">{lead.phone}</p>
                </div>
              )}
              {lead.website && (
                <div>
                  <span className="font-medium">Website:</span>
                  <p className="text-muted-foreground">{lead.website}</p>
                </div>
              )}
              {lead.position && (
                <div>
                  <span className="font-medium">Position:</span>
                  <p className="text-muted-foreground">{lead.position}</p>
                </div>
              )}
              {lead.industry && (
                <div>
                  <span className="font-medium">Industry:</span>
                  <p className="text-muted-foreground">{lead.industry}</p>
                </div>
              )}
              {lead.address && (
                <div className="md:col-span-2">
                  <span className="font-medium">Address:</span>
                  <p className="text-muted-foreground">{lead.address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="activities" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="todos">To-Dos</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="activities">
            <LeadActivities
              entityId={lead.id}
              entityType={lead.type}
              entityName={lead.name}
            />
          </TabsContent>

          <TabsContent value="todos">
            <LeadActivities
              entityId={lead.id}
              entityType={lead.type}
              entityName={lead.name}
            />
          </TabsContent>

          <TabsContent value="files">
            <LeadFiles
              leadId={lead.id}
              leadType={lead.type}
              leadName={lead.name}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LeadDetail;