import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`Checking for paused deals to resume as of ${today.toISOString()}`);

    // Find all deals with status_resume_date that has passed
    const { data: pausedDeals, error: fetchError } = await supabase
      .from('deals')
      .select(`
        id,
        name,
        tenant_id,
        deal_status_id,
        assigned_to,
        status_resume_date,
        deal_statuses!deal_status_id(name)
      `)
      .not('status_resume_date', 'is', null)
      .lte('status_resume_date', today.toISOString());

    if (fetchError) {
      console.error('Error fetching paused deals:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${pausedDeals?.length || 0} deals to resume`);

    const results = {
      processed: 0,
      resumed: 0,
      errors: [] as string[],
    };

    for (const deal of pausedDeals || []) {
      results.processed++;

      try {
        // Get the "Active" status for this tenant
        const { data: activeStatus, error: statusError } = await supabase
          .from('deal_statuses')
          .select('id, name')
          .eq('tenant_id', deal.tenant_id)
          .eq('active', true)
          .ilike('name', '%active%')
          .not('name', 'ilike', '%not%')
          .limit(1)
          .single();

        if (statusError || !activeStatus) {
          console.warn(`Could not find Active status for tenant ${deal.tenant_id}`);
          results.errors.push(`Deal ${deal.id}: Could not find Active status`);
          continue;
        }

        // Update the deal status to Active
        const { error: updateError } = await supabase
          .from('deals')
          .update({
            deal_status_id: activeStatus.id,
            status_resume_date: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deal.id);

        if (updateError) {
          console.error(`Error updating deal ${deal.id}:`, updateError);
          results.errors.push(`Deal ${deal.id}: ${updateError.message}`);
          continue;
        }

        // Log the status change in history
        await supabase
          .from('deal_status_history')
          .insert({
            tenant_id: deal.tenant_id,
            deal_id: deal.id,
            old_status_id: deal.deal_status_id,
            new_status_id: activeStatus.id,
            reason: 'Automatically resumed after pause period ended',
            changed_by: null, // System change
          });

        // Log activity
        await supabase
          .from('activities')
          .insert({
            tenant_id: deal.tenant_id,
            deal_id: deal.id,
            type: 'note',
            title: 'Deal Automatically Resumed',
            description: `Deal "${deal.name}" was automatically resumed from paused status after the scheduled resume date.`,
            created_by: deal.assigned_to || null,
          });

        // Create a notification for the assigned user
        if (deal.assigned_to) {
          await supabase
            .from('notifications')
            .insert({
              tenant_id: deal.tenant_id,
              user_id: deal.assigned_to,
              title: 'Deal Resumed',
              message: `Deal "${deal.name}" has been automatically resumed from paused status.`,
              type: 'deal_resumed',
              entity_type: 'deal',
              entity_id: deal.id,
            });
        }

        results.resumed++;
        console.log(`Resumed deal ${deal.id}: ${deal.name}`);
      } catch (error) {
        console.error(`Error processing deal ${deal.id}:`, error);
        results.errors.push(`Deal ${deal.id}: ${error.message}`);
      }
    }

    console.log('Check completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} deals, resumed ${results.resumed}`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in check-paused-deals:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
