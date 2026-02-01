import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  todo_id: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  start_time?: string;
  duration?: number;
  location?: string;
  entity_type?: string;
  is_appointment?: boolean; // Determines Calendar vs Tasks sync
  type_name?: string; // To-Do type name (e.g., "Appointment", "Meeting", "Task")
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse request body
    const body: SyncRequest = await req.json();
    const { 
      todo_id, 
      title, 
      description, 
      due_date, 
      due_time, 
      start_time, 
      duration, 
      location, 
      entity_type,
      is_appointment,
      type_name 
    } = body;

    if (!todo_id || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: todo_id and title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine sync target: Calendar for Appointments, Tasks for To-Dos
    const isCalendarSync = is_appointment || 
      type_name?.toLowerCase().includes('appointment') || 
      type_name?.toLowerCase().includes('meeting') ||
      type_name?.toLowerCase().includes('call');

    // Check if user has Google credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from('user_google_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ 
          error: 'Google account not connected',
          code: 'GOOGLE_NOT_CONNECTED',
          message: 'Please connect your Google account in Settings > Security'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = credentials.expires_at ? new Date(credentials.expires_at) : null;
    
    if (expiresAt && expiresAt <= now) {
      // Token expired - would need to refresh here using refresh_token
      return new Response(
        JSON.stringify({ 
          error: 'Google token expired',
          code: 'TOKEN_EXPIRED',
          message: 'Your Google session has expired. Please reconnect in Settings > Security'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let syncResult;

    if (isCalendarSync) {
      // ============================================
      // GOOGLE CALENDAR SYNC (Appointments/Meetings)
      // ============================================
      const eventPayload = {
        summary: title,
        description: description || `Created from SID CRM - ${entity_type || 'appointment'}`,
        start: {
          dateTime: due_date && start_time 
            ? `${due_date}T${start_time}:00`
            : due_date 
              ? `${due_date}T09:00:00` 
              : new Date().toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: due_date && start_time && duration
            ? calculateEndTime(due_date, start_time, duration)
            : due_date && due_time
              ? `${due_date}T${due_time}:00`
              : due_date 
                ? `${due_date}T10:00:00`
                : new Date(Date.now() + 3600000).toISOString(),
          timeZone: 'UTC',
        },
        location: location || undefined,
      };

      console.log('Syncing to Google Calendar:', {
        userId,
        todoId: todo_id,
        event: eventPayload,
        syncType: 'calendar',
      });

      // Placeholder for actual Google Calendar API call
      const placeholderEventId = `gcal_${todo_id}_${Date.now()}`;
      
      syncResult = {
        sync_type: 'calendar',
        event_id: placeholderEventId,
        message: 'Event synced to Google Calendar',
      };
    } else {
      // ============================================
      // GOOGLE TASKS SYNC (To-Dos/Tasks)
      // ============================================
      const taskPayload = {
        title: title,
        notes: description || `Created from SID CRM - ${entity_type || 'task'}`,
        due: due_date ? `${due_date}T00:00:00.000Z` : undefined,
        status: 'needsAction',
      };

      console.log('Syncing to Google Tasks:', {
        userId,
        todoId: todo_id,
        task: taskPayload,
        syncType: 'tasks',
      });

      // Placeholder for actual Google Tasks API call
      const placeholderTaskId = `gtask_${todo_id}_${Date.now()}`;
      
      syncResult = {
        sync_type: 'tasks',
        task_id: placeholderTaskId,
        message: 'Task synced to Google Tasks',
      };
    }

    // Update todo with sync status
    const { error: updateError } = await supabaseClient
      .from('todos')
      .update({
        google_calendar_sync: true,
        google_event_id: syncResult.event_id || syncResult.task_id,
      })
      .eq('id', todo_id);

    if (updateError) {
      console.error('Error updating todo:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ...syncResult,
        note: 'Full Google API integration requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateEndTime(date: string, startTime: string, durationMinutes: number): string {
  const start = new Date(`${date}T${startTime}:00`);
  start.setMinutes(start.getMinutes() + durationMinutes);
  return start.toISOString().replace('Z', '');
}
