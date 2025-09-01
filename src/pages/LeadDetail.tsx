import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { ComprehensiveLeadView } from '@/components/lead-details/ComprehensiveLeadView';

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
      let query;
      let leadData: any = null;

      if (type === 'contact') {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, position, address, notes, created_at, updated_at')
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
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      } else if (type === 'company') {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, email, phone, website, headquarters, industry, size, description, notes, created_at, updated_at')
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
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
        }
      } else if (type === 'site') {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name, address, city, state, country, notes, created_at, updated_at')
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/leads')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Lead Details</h1>
            <p className="text-muted-foreground">
              View and manage lead information
            </p>
          </div>
        </div>

        <ComprehensiveLeadView lead={lead} onUpdate={fetchLead} />
      </div>
    </DashboardLayout>
  );
};

export default LeadDetail;