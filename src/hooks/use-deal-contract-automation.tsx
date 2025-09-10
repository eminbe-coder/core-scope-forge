import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Deal {
  id: string;
  name: string;
  stage_id?: string;
  tenant_id: string;
  is_converted?: boolean;
}

interface DealStage {
  id: string;
  win_percentage: number;
}

export const useDealContractAutomation = (deal: Deal | null) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!deal || deal.is_converted === true) return;

    const checkDealStageCompletion = async () => {
      if (!deal.stage_id) return;

      try {
        // Get the current stage's win percentage
        const { data: stage, error: stageError } = await supabase
          .from('deal_stages')
          .select('win_percentage')
          .eq('id', deal.stage_id)
          .single();

        if (stageError || !stage) return;

        // If stage has 100% win percentage, trigger contract creation
        if (stage.win_percentage === 100) {
          toast.success('Deal completed! Creating contract...', {
            duration: 3000,
          });

          // Navigate to contract creation with deal data
          setTimeout(() => {
            navigate(`/contracts/add?dealId=${deal.id}`);
          }, 1500);
        }
      } catch (error) {
        console.error('Error checking deal stage completion:', error);
      }
    };

    checkDealStageCompletion();
  }, [deal?.stage_id, deal?.is_converted, navigate, deal?.id]);

  return null;
};