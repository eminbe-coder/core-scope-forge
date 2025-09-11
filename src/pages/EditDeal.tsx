import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { useDealContractAutomation } from '@/hooks/use-deal-contract-automation';
import { CreateActivityModal } from '@/components/modals/CreateActivityModal';
import { TodoForm } from '@/components/todos/TodoForm';
import { ComprehensiveDealView } from '@/components/deals/ComprehensiveDealView';
import type { ComprehensiveDealViewRef } from '@/components/deals/ComprehensiveDealView';

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
  tenant_id: string;
  is_converted?: boolean;
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
  const [showTodoModal, setShowTodoModal] = useState(false);
  const dealViewRef = useRef<ComprehensiveDealViewRef>(null);

  // Auto-trigger contract creation when deal reaches 100%
  useDealContractAutomation(deal);

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
              Comprehensive deal management with all related information
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowTodoModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Todo
            </Button>
            <Button onClick={() => setShowActivityModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          </div>
        </div>

        <ComprehensiveDealView ref={dealViewRef} deal={deal} onUpdate={fetchDeal} />
      </div>

      <CreateActivityModal
        open={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        onSuccess={() => {
          setShowActivityModal(false);
          fetchDeal();
          toast({
            title: 'Success',
            description: 'Activity logged successfully',
          });
        }}
        entityId={deal.id}
        entityType="deal"
        entityName={deal.name}
      />

      <TodoForm
        entityType="deal"
        entityId={deal.id}
        onSuccess={() => {
          setShowTodoModal(false);
          fetchDeal();
          dealViewRef.current?.refreshTodos();
        }}
        trigger={
          <Button variant="outline" onClick={() => setShowTodoModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Todo
          </Button>
        }
        defaultOpen={showTodoModal}
      />
    </DashboardLayout>
  );
};

export default EditDeal;