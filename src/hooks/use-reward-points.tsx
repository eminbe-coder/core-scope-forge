import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useTenant } from '@/hooks/use-tenant';

interface RewardConfiguration {
  id: string;
  action_name: string;
  action_description: string;
  points_value: number;
  active: boolean;
}

interface PointTransaction {
  id: string;
  action_name: string;
  points_earned: number;
  entity_type: string;
  entity_id: string;
  notes: string;
  created_at: string;
}

interface PeriodCycle {
  id: string;
  period_type: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

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
      
      // Load all-time total points - use maybeSingle to avoid 406 error when no row exists
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_reward_points')
        .select('total_points')
        .eq('user_id', user?.id)
        .eq('tenant_id', currentTenant?.id)
        .maybeSingle();

      if (pointsError) {
        throw pointsError;
      }

      setTotalPoints(pointsData?.total_points || 0);

      // Load current period target and progress - use maybeSingle to avoid 406 error
      const { data: cycleData, error: cycleError } = await supabase
        .from('reward_period_cycles')
        .select('id')
        .eq('tenant_id', currentTenant?.id)
        .eq('is_current', true)
        .maybeSingle();

      if (cycleError) {
        console.error('Error loading cycle:', cycleError);
        return;
      }

      if (cycleData) {
        // Use maybeSingle to avoid 406 error when no target exists
        const { data: targetData, error: targetError } = await supabase
          .from('user_reward_targets')
          .select('target_points, current_points, achieved')
          .eq('user_id', user?.id)
          .eq('tenant_id', currentTenant?.id)
          .eq('period_cycle_id', cycleData.id)
          .maybeSingle();

        if (targetError) {
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

  const loadAvailableActions = async (): Promise<RewardConfiguration[]> => {
    if (!currentTenant?.id) return [];

    try {
      const { data, error } = await supabase
        .from('reward_configurations')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('action_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading available actions:', error);
      return [];
    }
  };

  const loadTransactionHistory = async (cycleId?: string): Promise<PointTransaction[]> => {
    if (!user?.id || !currentTenant?.id) return [];

    try {
      let query = supabase
        .from('reward_point_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      // If cycleId is provided, filter by date range
      if (cycleId) {
        const { data: cycle } = await supabase
          .from('reward_period_cycles')
          .select('start_date, end_date')
          .eq('id', cycleId)
          .single();

        if (cycle) {
          query = query
            .gte('created_at', cycle.start_date)
            .lte('created_at', cycle.end_date);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading transaction history:', error);
      return [];
    }
  };

  const loadPeriodCycles = async (): Promise<PeriodCycle[]> => {
    if (!currentTenant?.id) return [];

    try {
      const { data, error } = await supabase
        .from('reward_period_cycles')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading period cycles:', error);
      return [];
    }
  };

  return {
    totalPoints,
    currentPoints,
    targetPoints,
    achieved,
    loading,
    awardPoints,
    refreshPoints: loadUserPoints,
    loadAvailableActions,
    loadTransactionHistory,
    loadPeriodCycles
  };
};