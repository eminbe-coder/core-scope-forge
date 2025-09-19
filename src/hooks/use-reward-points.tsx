import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';

export const useRewardPoints = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [currentPoints, setCurrentPoints] = useState<number>(0);
  const [targetPoints, setTargetPoints] = useState<number>(100);
  const [achieved, setAchieved] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id && currentTenant?.id) {
      loadUserPoints();
    }
  }, [user?.id, currentTenant?.id]);

  const loadUserPoints = async () => {
    try {
      setLoading(true);
      
      // Load all-time total points
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_reward_points')
        .select('total_points')
        .eq('user_id', user?.id)
        .eq('tenant_id', currentTenant?.id)
        .single();

      if (pointsError && pointsError.code !== 'PGRST116') {
        throw pointsError;
      }

      setTotalPoints(pointsData?.total_points || 0);

      // Load current period target and progress
      const { data: cycleData, error: cycleError } = await supabase
        .from('reward_period_cycles')
        .select('id')
        .eq('tenant_id', currentTenant?.id)
        .eq('is_current', true)
        .single();

      if (cycleError && cycleError.code !== 'PGRST116') {
        console.error('No current cycle found');
        return;
      }

      if (cycleData) {
        const { data: targetData, error: targetError } = await supabase
          .from('user_reward_targets')
          .select('target_points, current_points, achieved')
          .eq('user_id', user?.id)
          .eq('tenant_id', currentTenant?.id)
          .eq('period_cycle_id', cycleData.id)
          .single();

        if (targetError && targetError.code !== 'PGRST116') {
          console.error('Error loading target:', targetError);
        }

        if (targetData) {
          setCurrentPoints(targetData.current_points);
          setTargetPoints(targetData.target_points);
          setAchieved(targetData.achieved);
        } else {
          // Create default target if none exists
          const { error: insertError } = await supabase
            .from('user_reward_targets')
            .insert({
              user_id: user?.id,
              tenant_id: currentTenant?.id,
              period_cycle_id: cycleData.id,
              target_points: 100,
              current_points: 0
            });

          if (insertError) {
            console.error('Error creating default target:', insertError);
          } else {
            setCurrentPoints(0);
            setTargetPoints(100);
            setAchieved(false);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user points:', error);
      setTotalPoints(0);
      setCurrentPoints(0);
      setTargetPoints(100);
      setAchieved(false);
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
    currentPoints,
    targetPoints,
    achieved,
    loading,
    awardPoints,
    refreshPoints: loadUserPoints
  };
};