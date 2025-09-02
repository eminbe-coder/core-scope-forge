import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TargetProgressRequest {
  tenantId: string;
  level?: 'company' | 'branch' | 'department' | 'user';
  entityId?: string;
  periodStart?: string;
  periodEnd?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { tenantId, level, entityId, periodStart, periodEnd }: TargetProgressRequest = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calculating target progress for:', { tenantId, level, entityId, periodStart, periodEnd });

    // Get targets based on filters
    let targetsQuery = supabaseClient
      .from('targets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (level) targetsQuery = targetsQuery.eq('target_level', level);
    if (entityId) targetsQuery = targetsQuery.eq('entity_id', entityId);
    if (periodStart) targetsQuery = targetsQuery.gte('period_start', periodStart);
    if (periodEnd) targetsQuery = targetsQuery.lte('period_end', periodEnd);

    const { data: targets, error: targetsError } = await targetsQuery;
    if (targetsError) throw targetsError;

    const targetProgress = await Promise.all(
      targets.map(async (target) => {
        let actualValue = 0;
        const { period_start, period_end, target_type, target_level, entity_id } = target;

        // Calculate actual achievements based on target type
        switch (target_type) {
          case 'leads_count':
            // Count leads created in period
            let leadsQuery = supabaseClient
              .from('companies')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenantId)
              .eq('is_lead', true)
              .gte('created_at', period_start)
              .lte('created_at', period_end);

            if (target_level === 'user' && entity_id) {
              // For user-level targets, we'd need to track who created the lead
              // This would require an additional field in companies table
            }

            const { count: leadsCount } = await leadsQuery;
            actualValue = leadsCount || 0;
            break;

          case 'deals_count':
            // Count deals closed in period
            let dealsQuery = supabaseClient
              .from('deals')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenantId)
              .in('status', ['won', 'closed'])
              .gte('updated_at', period_start)
              .lte('updated_at', period_end);

            if (target_level === 'user' && entity_id) {
              dealsQuery = dealsQuery.eq('assigned_to', entity_id);
            }

            const { count: dealsCount } = await dealsQuery;
            actualValue = dealsCount || 0;
            break;

          case 'deals_value':
            // Sum deal values closed in period
            let dealsValueQuery = supabaseClient
              .from('deals')
              .select('value')
              .eq('tenant_id', tenantId)
              .in('status', ['won', 'closed'])
              .gte('updated_at', period_start)
              .lte('updated_at', period_end);

            if (target_level === 'user' && entity_id) {
              dealsValueQuery = dealsValueQuery.eq('assigned_to', entity_id);
            }

            const { data: dealValues } = await dealsValueQuery;
            actualValue = dealValues?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;
            break;

          case 'payments_value':
            // Sum payments received in period
            let paymentsQuery = supabaseClient
              .from('contract_payment_terms')
              .select(`
                calculated_amount,
                contracts!inner(tenant_id, assigned_to)
              `)
              .eq('contracts.tenant_id', tenantId)
              .gte('due_date', period_start)
              .lte('due_date', period_end);

            if (target_level === 'user' && entity_id) {
              paymentsQuery = paymentsQuery.eq('contracts.assigned_to', entity_id);
            }

            const { data: payments } = await paymentsQuery;
            actualValue = payments?.reduce((sum, payment) => sum + (payment.calculated_amount || 0), 0) || 0;
            break;
        }

        // Get entity name for display
        let entityName = 'Company-wide';
        if (entity_id) {
          if (target_level === 'branch') {
            const { data: branch } = await supabaseClient
              .from('branches')
              .select('name')
              .eq('id', entity_id)
              .single();
            entityName = branch?.name || 'Unknown Branch';
          } else if (target_level === 'department') {
            const { data: department } = await supabaseClient
              .from('departments')
              .select('name')
              .eq('id', entity_id)
              .single();
            entityName = department?.name || 'Unknown Department';
          } else if (target_level === 'user') {
            const { data: user } = await supabaseClient
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', entity_id)
              .single();
            entityName = user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
          }
        }

        const progressPercentage = target.target_value > 0 ? (actualValue / target.target_value) * 100 : 0;

        return {
          ...target,
          actualValue,
          progressPercentage: Math.round(progressPercentage * 100) / 100,
          entityName,
          status: progressPercentage >= 100 ? 'achieved' : progressPercentage >= 75 ? 'on-track' : 'behind'
        };
      })
    );

    return new Response(
      JSON.stringify({ data: targetProgress }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating target progress:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});