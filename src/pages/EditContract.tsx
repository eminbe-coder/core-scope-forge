import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateContractForm } from '@/components/forms/CreateContractForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';

interface Contract {
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
  status: string;
  signed_date?: string;
  start_date?: string;
  end_date?: string;
  solution_category_ids?: string[];
}

const EditContract = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentTenant } = useTenant();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && currentTenant?.id) {
      fetchContract();
    }
  }, [id, currentTenant?.id]);

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', currentTenant?.id)
        .single();

      if (error) throw error;
      setContract(data as Contract);
    } catch (error) {
      console.error('Error fetching contract:', error);
      toast.error('Failed to load contract details');
      navigate('/contracts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(`/contracts/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contract
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
          <Button variant="outline" onClick={() => navigate(`/contracts/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contract
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Contract</h1>
            <p className="text-muted-foreground">Update contract details and information</p>
          </div>
        </div>

        {contract && (
          <CreateContractForm 
            contract={contract}
            onSuccess={() => navigate(`/contracts/${id}`)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default EditContract;
