import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';

interface DealStatus {
  id: string;
  name: string;
  requires_reason?: boolean;
  is_pause_status?: boolean;
}

interface StatusChangeResult {
  success: boolean;
  error?: string;
}

export const useDealStatusChange = () => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Check if a status requires a reason based on name patterns
  const statusRequiresReason = useCallback((statusName: string): boolean => {
    const reasonRequiredPatterns = ['lost', 'not active', 'paused', 'cancelled', 'rejected'];
    return reasonRequiredPatterns.some(pattern => 
      statusName.toLowerCase().includes(pattern)
    );
  }, []);

  // Check if status is a pause status
  const isPauseStatus = useCallback((statusName: string): boolean => {
    return statusName.toLowerCase().includes('paused');
  }, []);

  // Get the active status ID for the tenant
  const getActiveStatusId = useCallback(async (): Promise<string | null> => {
    if (!currentTenant) return null;

    const { data, error } = await supabase
      .from('deal_statuses')
      .select('id')
      .eq('tenant_id', currentTenant.id)
      .eq('active', true)
      .ilike('name', '%active%')
      .not('name', 'ilike', '%not%')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching active status:', error);
      return null;
    }

    return data?.id || null;
  }, [currentTenant]);

  // Log status change to history
  const logStatusChange = useCallback(async (
    dealId: string,
    oldStatusId: string | null,
    newStatusId: string,
    reason: string,
    resumeDate?: Date
  ): Promise<StatusChangeResult> => {
    if (!currentTenant) {
      return { success: false, error: 'No tenant selected' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('deal_status_history')
        .insert({
          tenant_id: currentTenant.id,
          deal_id: dealId,
          old_status_id: oldStatusId,
          new_status_id: newStatusId,
          reason,
          resume_date: resumeDate?.toISOString() || null,
          changed_by: user.id,
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error logging status change:', error);
      return { success: false, error: error.message };
    }
  }, [currentTenant]);

  // Update deal status with reason
  const updateDealStatus = useCallback(async (
    dealId: string,
    oldStatusId: string | null,
    newStatusId: string,
    newStatusName: string,
    reason: string,
    resumeDate?: Date
  ): Promise<StatusChangeResult> => {
    if (!currentTenant) {
      return { success: false, error: 'No tenant selected' };
    }

    setLoading(true);

    try {
      // Update the deal status
      const updateData: any = {
        deal_status_id: newStatusId,
        updated_at: new Date().toISOString(),
      };

      // If it's a pause status, set the resume date
      if (isPauseStatus(newStatusName) && resumeDate) {
        updateData.status_resume_date = resumeDate.toISOString();
      } else {
        updateData.status_resume_date = null;
      }

      const { error: updateError } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);

      if (updateError) throw updateError;

      // Log the status change
      const logResult = await logStatusChange(
        dealId,
        oldStatusId,
        newStatusId,
        reason,
        resumeDate
      );

      if (!logResult.success) {
        console.warn('Failed to log status change:', logResult.error);
        // Don't fail the whole operation if logging fails
      }

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('activities')
          .insert({
            tenant_id: currentTenant.id,
            deal_id: dealId,
            type: 'note',
            title: 'Status Changed',
            description: `Status changed to "${newStatusName}". Reason: ${reason}${resumeDate ? `. Expected resume: ${resumeDate.toLocaleDateString()}` : ''}`,
            created_by: user.id,
          });
      }

      toast({
        title: 'Status Updated',
        description: `Deal status changed to "${newStatusName}"`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating deal status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update deal status',
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [currentTenant, isPauseStatus, logStatusChange, toast]);

  // Fetch status history for a deal
  const fetchStatusHistory = useCallback(async (dealId: string) => {
    if (!currentTenant) return [];

    try {
      const { data, error } = await supabase
        .from('deal_status_history')
        .select(`
          id,
          reason,
          resume_date,
          created_at,
          changed_by,
          old_status:old_status_id(id, name),
          new_status:new_status_id(id, name),
          profiles:changed_by(first_name, last_name)
        `)
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching status history:', error);
      return [];
    }
  }, [currentTenant]);

  return {
    loading,
    statusRequiresReason,
    isPauseStatus,
    getActiveStatusId,
    logStatusChange,
    updateDealStatus,
    fetchStatusHistory,
  };
};
