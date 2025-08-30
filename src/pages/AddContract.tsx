import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateContractForm } from '@/components/forms/CreateContractForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Deal {
  id: string;
  name: string;
  description?: string;
  value?: number;
  currency_id?: string;
  customer_id?: string;
  site_id?: string;
  customer_reference_number?: string;
  assigned_to?: string;
  notes?: string;
  stage_id?: string;
}

const AddContract = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('dealId');
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(!!dealId);

  useEffect(() => {
    if (dealId) {
      fetchDeal();
    }
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (error) throw error;
      setDeal(data);
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast.error('Failed to load deal details');
    } finally {
      setLoading(false);
    }
  };

  const isPromotingDeal = !!dealId && !!deal;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/contracts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Loading...</h1>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/contracts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contracts
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isPromotingDeal ? 'Promote Deal to Contract' : 'Create New Contract'}
            </h1>
            <p className="text-muted-foreground">
              {isPromotingDeal 
                ? 'Convert this deal into a finalized contract' 
                : 'Create a new contract from scratch'
              }
            </p>
          </div>
        </div>

        <CreateContractForm 
          deal={deal}
          onSuccess={() => navigate('/contracts')}
        />
      </div>
    </DashboardLayout>
  );
};

export default AddContract;