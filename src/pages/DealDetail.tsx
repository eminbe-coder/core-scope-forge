import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComprehensiveDealView } from '@/components/deals/ComprehensiveDealView';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';

interface Deal {
  id: string;
  name: string;
  description?: string;
  value?: number;
  status: string;
  stage_id?: string;
  deal_status_id?: string;
  site_id?: string;
  customer_id?: string;
  currency_id?: string;
  customer_reference_number?: string;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
  assigned_to?: string;
  solution_category_ids?: string[];
  customers?: {
    id: string;
    name: string;
  } | null;
  sites?: {
    name: string;
  } | null;
  currencies?: {
    symbol: string;
  } | null;
  deal_stages?: {
    name: string;
    win_percentage: number;
  } | null;
  assigned_user?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
  tenant_id: string;
  source_id?: string;
  contact_id?: string;
  company_id?: string;
  converted_to_contract_id?: string;
  deal_sources?: { name: string; color: string } | null;
  deal_statuses?: { name: string; color: string } | null;
  contacts?: { first_name?: string; last_name?: string } | null;
  companies?: { name: string } | null;
}

const DealDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDeal = async () => {
    if (!id || !currentTenant?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', currentTenant.id)
        .single();

      if (error) throw error;
      setDeal(data as any);
    } catch (error: any) {
      console.error('Error fetching deal:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch deal details',
        variant: 'destructive',
      });
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeal();
  }, [id, currentTenant?.id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-muted-foreground">Loading deal details...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!deal) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Deal Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                The deal you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button onClick={() => navigate('/deals')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Deals
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/deals')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-5 mr-2" />
            Back to Deals
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{deal.name}</h1>
            <p className="text-muted-foreground">
              Deal Details
            </p>
          </div>
        </div>

        <ComprehensiveDealView 
          deal={deal as any} 
          onUpdate={fetchDeal}
        />
      </div>
    </DashboardLayout>
  );
};

export default DealDetail;