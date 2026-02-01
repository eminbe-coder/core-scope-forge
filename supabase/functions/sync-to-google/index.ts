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
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse request body
    const body: SyncRequest = await req.json();
    const { todo_id, title, description, due_date, due_time, start_time, duration, location, entity_type } = body;

    if (!todo_id || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: todo_id and title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          message: 'Please connect your Google account in Settings > Connections'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = credentials.expires_at ? new Date(credentials.expires_at) : null;
    
    if (expiresAt && expiresAt <= now) {
      // Token expired - would need to refresh here using refresh_token
      // For now, return an error asking user to reconnect
      return new Response(
        JSON.stringify({ 
          error: 'Google token expired',
          code: 'TOKEN_EXPIRED',
          message: 'Your Google session has expired. Please reconnect in Settings > Connections'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Google Calendar event payload
    // Note: This is a placeholder - actual Google Calendar API integration would go here
    const eventPayload = {
      summary: title,
      description: description || `Created from SID CRM - ${entity_type || 'task'}`,
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

    // Placeholder response - actual Google API call would go here
    // In production, you would:
    // 1. Use credentials.access_token to call Google Calendar API
    // 2. Create/update the event
    // 3. Store the returned event ID in the todo record
    
    console.log('Would sync to Google Calendar:', {
      userId,
      todoId: todo_id,
      event: eventPayload,
    });

    // Update todo with sync status (placeholder event ID)
    const placeholderEventId = `placeholder_${todo_id}_${Date.now()}`;
    
    const { error: updateError } = await supabaseClient
      .from('todos')
      .update({
        google_calendar_sync: true,
        google_event_id: placeholderEventId,
      })
      .eq('id', todo_id);

    if (updateError) {
      console.error('Error updating todo:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Google Calendar sync prepared (API integration pending)',
        event_id: placeholderEventId,
        note: 'Full Google Calendar API integration requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets'
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
