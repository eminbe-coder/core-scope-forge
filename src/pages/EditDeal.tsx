import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, FileText, Calendar, CheckSquare, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { CreateActivityModal } from '@/components/modals/CreateActivityModal';
import { DealFiles } from '@/components/deals/DealFiles';
import { DealActivities } from '@/components/deals/DealActivities';
import { DealInfo } from '@/components/deals/DealInfo';
import { DealTodos } from '@/components/deals/DealTodos';

interface Deal {
  id: string;
  name: string;
  description?: string;
  value?: number;
  status: string;
  stage_id?: string;
  site_id?: string;
  customer_id?: string;
  customer_reference_number?: string;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
  assigned_to?: string;
  customers?: {
    id: string;
    name: string;
  };
  sites?: {
    name: string;
  };
  currencies?: {
    symbol: string;
  };
  deal_stages?: {
    name: string;
    win_percentage: number;
  };
  assigned_user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

const EditDeal = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const fetchDeal = async () => {
    if (!id || !currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('deals')
        .select(`
          *,
          customers(id, name),
          sites(name),
          currencies(symbol),
          deal_stages(name, win_percentage),
          assigned_user:profiles!deals_assigned_to_fkey(first_name, last_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setDeal(data);
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
  }, [id, currentTenant]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading deal...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!deal) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Deal not found</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/deals')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{deal.name}</h1>
            <p className="text-muted-foreground">
              Manage deal activities, tasks, and files
            </p>
          </div>
          {deal.deal_stages && (
            <Badge 
              className={`text-white ${deal.deal_stages.win_percentage >= 80 ? 'bg-green-500' : 
                                     deal.deal_stages.win_percentage >= 60 ? 'bg-orange-500' :
                                     deal.deal_stages.win_percentage >= 30 ? 'bg-yellow-500' :
                                     deal.deal_stages.win_percentage >= 10 ? 'bg-blue-500' :
                                     'bg-gray-500'}`}
              variant="secondary"
            >
              {deal.deal_stages.name} ({deal.deal_stages.win_percentage}%)
            </Badge>
          )}
          <Button onClick={() => setShowActivityModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Activity
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="todos">To-Dos</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DealInfo deal={deal} onUpdate={fetchDeal} />
          </TabsContent>

          <TabsContent value="activities">
            <DealActivities dealId={deal.id} />
          </TabsContent>

          <TabsContent value="todos">
            <DealTodos dealId={deal.id} dealName={deal.name} />
          </TabsContent>

          <TabsContent value="files">
            <DealFiles dealId={deal.id} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateActivityModal
        open={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        onSuccess={() => {
          setShowActivityModal(false);
          toast({
            title: 'Success',
            description: 'Activity logged successfully',
          });
        }}
        entityId={deal.id}
        entityType="deal"
        entityName={deal.name}
      />
    </DashboardLayout>
  );
};

export default EditDeal;