import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';

export const useRewardPoints = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id && currentTenant?.id) {
      loadUserPoints();
    }
  }, [user?.id, currentTenant?.id]);

  const loadUserPoints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_reward_points')
        .select('total_points')
        .eq('user_id', user?.id)
        .eq('tenant_id', currentTenant?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setTotalPoints(data?.total_points || 0);
    } catch (error) {
      console.error('Error loading user points:', error);
      setTotalPoints(0);
    } finally {
      setLoading(false);
    }
  };

  const awardPoints = async (
    actionName: string, 
    entityType?: string, 
    entityId?: string, 
    notes?: string
  ) => {
    if (!user?.id || !currentTenant?.id) return;

    try {
      const { error } = await supabase.rpc('award_points', {
        _user_id: user.id,
        _tenant_id: currentTenant.id,
        _action_name: actionName,
        _entity_type: entityType,
        _entity_id: entityId,
        _notes: notes
      });

      if (error) throw error;

      // Refresh points after awarding
      loadUserPoints();
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  return {
    totalPoints,
    loading,
    awardPoints,
    refreshPoints: loadUserPoints
  };
};