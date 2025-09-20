import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from './use-tenant';
import { toast } from 'sonner';

interface TodoPreferences {
  view_type: 'list' | 'calendar';
  filter_status: string;
  filter_priority: string;
  filter_type: string;
  filter_assigned: string;
  filter_category: string;
  filter_due_date: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  calendar_height?: number;
  calendar_view?: string;
  calendar_date?: string;
  column_widths?: { [key: string]: number };
  time_slot_height?: number;
}

const defaultPreferences: TodoPreferences = {
  view_type: 'list',
  filter_status: 'all',
  filter_priority: 'all',
  filter_type: 'all',
  filter_assigned: 'all',
  filter_category: 'all',
  filter_due_date: 'all',
  sort_by: 'created_at',
  sort_order: 'desc',
  calendar_height: 700,
  calendar_view: 'week',
  column_widths: {},
  time_slot_height: 30,
};

export const useTodoPreferences = () => {
  const { currentTenant } = useTenant();
  const [preferences, setPreferences] = useState<TodoPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant?.id) {
      loadPreferences();
    }
  }, [currentTenant?.id]);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentTenant?.id) return;

      const { data, error } = await supabase
        .from('user_todo_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          view_type: data.view_type as 'list' | 'calendar',
          filter_status: data.filter_status || 'all',
          filter_priority: data.filter_priority || 'all',
          filter_type: data.filter_type || 'all',
          filter_assigned: data.filter_assigned || 'all',
          filter_category: data.filter_category || 'all',
          filter_due_date: data.filter_due_date || 'all',
          sort_by: data.sort_by || 'created_at',
          sort_order: (data.sort_order as 'asc' | 'desc') || 'desc',
          calendar_height: data.calendar_height || 700,
          calendar_view: data.calendar_view || 'week',
          calendar_date: data.calendar_date,
          column_widths: (typeof data.column_widths === 'object' && data.column_widths) ? data.column_widths as { [key: string]: number } : {},
          time_slot_height: data.time_slot_height || 30,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Partial<TodoPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentTenant?.id) return;

      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);

      console.log('Saving preferences:', updatedPreferences);

      const { error } = await supabase
        .from('user_todo_preferences')
        .upsert({
          user_id: user.id,
          tenant_id: currentTenant.id,
          ...updatedPreferences,
        }, { 
          onConflict: 'user_id,tenant_id' 
        });

      if (error) {
        console.error('Error saving preferences:', error);
        console.error('Error details:', error.details, error.hint, error.message);
        toast.error(`Failed to save preferences: ${error.message}`);
        return;
      }

      console.log('Preferences saved successfully');
      toast.success('Preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  const updatePreference = (key: keyof TodoPreferences, value: any) => {
    // Update local state only, don't auto-save
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const saveCurrentPreferences = () => {
    // Create a clean copy of preferences to save
    const prefsToSave = { ...preferences };
    
    // Handle calendar_date properly - ensure it's in correct format or remove it
    if (prefsToSave.calendar_date) {
      const date = new Date(prefsToSave.calendar_date);
      if (isNaN(date.getTime())) {
        // Invalid date, remove it
        delete prefsToSave.calendar_date;
      } else {
        // Convert to PostgreSQL compatible timestamp format (without milliseconds)
        prefsToSave.calendar_date = date.toISOString().split('.')[0] + 'Z';
      }
    }
    
    // Log what we're trying to save for debugging
    console.log('Saving preferences:', prefsToSave);
    
    savePreferences(prefsToSave);
  };

  return {
    preferences,
    loading,
    updatePreference,
    savePreferences,
    saveCurrentPreferences,
  };
};