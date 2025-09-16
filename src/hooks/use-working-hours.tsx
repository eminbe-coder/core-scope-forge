import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export interface WorkingHours {
  id?: string;
  user_id: string;
  tenant_id: string;
  working_days: number[]; // 1=Monday, 7=Sunday
  start_time: string;
  end_time: string;
  timezone: string;
  custom_holidays: string[];
}

const defaultWorkingHours: Omit<WorkingHours, 'id' | 'user_id' | 'tenant_id'> = {
  working_days: [1, 2, 3, 4, 5], // Monday to Friday
  start_time: '09:00',
  end_time: '18:00',
  timezone: 'UTC',
  custom_holidays: []
};

export const useWorkingHours = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant?.id && user?.id) {
      loadWorkingHours();
    }
  }, [currentTenant?.id, user?.id]);

  const loadWorkingHours = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_working_hours')
        .select('*')
        .eq('user_id', user?.id)
        .eq('tenant_id', currentTenant?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      if (data) {
        setWorkingHours(data);
      } else {
        // Create default working hours if none exist
        const newWorkingHours = {
          ...defaultWorkingHours,
          user_id: user!.id,
          tenant_id: currentTenant!.id
        };
        
        const { data: insertedData, error: insertError } = await supabase
          .from('user_working_hours')
          .insert(newWorkingHours)
          .select()
          .single();

        if (insertError) throw insertError;
        setWorkingHours(insertedData);
      }
    } catch (error) {
      console.error('Error loading working hours:', error);
      toast.error('Failed to load working hours settings');
    } finally {
      setLoading(false);
    }
  };

  const saveWorkingHours = async (updates: Partial<WorkingHours>) => {
    try {
      if (!workingHours?.id) return;

      const { error } = await supabase
        .from('user_working_hours')
        .update(updates)
        .eq('id', workingHours.id);

      if (error) throw error;

      setWorkingHours(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Working hours saved successfully');
    } catch (error) {
      console.error('Error saving working hours:', error);
      toast.error('Failed to save working hours');
    }
  };

  const isWorkingTime = (date: Date): boolean => {
    if (!workingHours) return true;

    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday from 0 to 7
    const timeString = date.toTimeString().split(' ')[0].slice(0, 5); // HH:MM format
    const dateString = date.toISOString().split('T')[0];

    // Check if it's a working day
    if (!workingHours.working_days.includes(dayOfWeek)) {
      return false;
    }

    // Check if it's a custom holiday
    if (workingHours.custom_holidays.includes(dateString)) {
      return false;
    }

    // Check if it's within working hours
    return timeString >= workingHours.start_time && timeString <= workingHours.end_time;
  };

  const calculateStartTime = (dueDate: Date, durationMinutes: number): Date => {
    if (!workingHours) {
      // Fallback: just subtract duration
      return new Date(dueDate.getTime() - durationMinutes * 60 * 1000);
    }

    let remainingMinutes = durationMinutes;
    let currentDate = new Date(dueDate);

    while (remainingMinutes > 0) {
      // Move backwards one minute
      currentDate.setMinutes(currentDate.getMinutes() - 1);
      
      // If we're in working time, subtract from remaining minutes
      if (isWorkingTime(currentDate)) {
        remainingMinutes--;
      }
    }

    return currentDate;
  };

  return {
    workingHours,
    loading,
    saveWorkingHours,
    isWorkingTime,
    calculateStartTime,
    refresh: loadWorkingHours
  };
};