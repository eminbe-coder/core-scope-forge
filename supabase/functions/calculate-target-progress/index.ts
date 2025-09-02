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
          case 'leads_count': {
            // Count all leads (companies, contacts, sites) created within target period
            let totalLeads = 0;
            
            // Count company leads
            let companyLeadsQuery = supabaseClient
              .from('companies')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenantId)
              .eq('is_lead', true)
              .eq('active', true)
              .gte('created_at', period_start)
              .lte('created_at', period_end);

            // Count contact leads
            let contactLeadsQuery = supabaseClient
              .from('contacts')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenantId)
              .eq('is_lead', true)
              .eq('active', true)
              .gte('created_at', period_start)
              .lte('created_at', period_end);

            // Count site leads
            let siteLeadsQuery = supabaseClient
              .from('sites')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenantId)
              .eq('is_lead', true)
              .eq('active', true)
              .gte('created_at', period_start)
              .lte('created_at', period_end);

            // Apply user-level filtering by checking activity logs for lead creation
            if (target_level === 'user' && entity_id) {
              // For user-level targets, we need to count leads created by specific user
              let userLeadsQuery = supabaseClient
                .from('activity_logs')
                .select('entity_id', { count: 'exact' })
                .eq('tenant_id', tenantId)
                .eq('activity_type', 'lead_created')
                .eq('created_by', entity_id)
                .gte('created_at', period_start)
                .lte('created_at', period_end);
              
              const { count: userLeadsCount } = await userLeadsQuery;
              actualValue = userLeadsCount || 0;
            } else {
              // For company/branch/department level, count all leads
              const [companyResult, contactResult, siteResult] = await Promise.all([
                companyLeadsQuery,
                contactLeadsQuery, 
                siteLeadsQuery
              ]);
              
              totalLeads = (companyResult.count || 0) + (contactResult.count || 0) + (siteResult.count || 0);
              actualValue = totalLeads;
            }
            break;
          }

          case 'deals_count':
            // Count deals with won status created/updated in period
            let dealsQuery = supabaseClient
              .from('deals')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenantId)
              .eq('status', 'won');

            // Check both created_at and updated_at to capture all relevant deals
            const createdDealsQuery = supabaseClient
              .from('deals')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenantId)
              .eq('status', 'won')
              .gte('created_at', period_start)
              .lte('created_at', period_end);

            const updatedDealsQuery = supabaseClient
              .from('deals')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenantId)
              .eq('status', 'won')
              .gte('updated_at', period_start)
              .lte('updated_at', period_end);

            // Apply user-level filtering
            if (target_level === 'user' && entity_id) {
              createdDealsQuery.eq('assigned_to', entity_id);
              updatedDealsQuery.eq('assigned_to', entity_id);
            }

            const [createdResult, updatedResult] = await Promise.all([
              createdDealsQuery,
              updatedDealsQuery
            ]);

            // Use the higher count to ensure we capture all relevant deals
            actualValue = Math.max(createdResult.count || 0, updatedResult.count || 0);
            break;

          case 'deals_value':
            // Sum deal values for won deals created/updated in period
            let createdDealsValueQuery = supabaseClient
              .from('deals')
              .select('value')
              .eq('tenant_id', tenantId)
              .eq('status', 'won')
              .gte('created_at', period_start)
              .lte('created_at', period_end);

            let updatedDealsValueQuery = supabaseClient
              .from('deals')
              .select('value')
              .eq('tenant_id', tenantId)
              .eq('status', 'won')
              .gte('updated_at', period_start)
              .lte('updated_at', period_end);

            // Apply user-level filtering
            if (target_level === 'user' && entity_id) {
              createdDealsValueQuery = createdDealsValueQuery.eq('assigned_to', entity_id);
              updatedDealsValueQuery = updatedDealsValueQuery.eq('assigned_to', entity_id);
            }

            const [createdDealsResult, updatedDealsResult] = await Promise.all([
              createdDealsValueQuery,
              updatedDealsValueQuery
            ]);

            const createdValue = createdDealsResult.data?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;
            const updatedValue = updatedDealsResult.data?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;
            
            // Use the higher value to ensure we capture all relevant deals
            actualValue = Math.max(createdValue, updatedValue);
            break;

          case 'payments_value':
            // Sum payments due in period (using due_date as the primary criterion)
            let paymentsQuery = supabaseClient
              .from('contract_payment_terms')
              .select(`
                calculated_amount,
                contracts!inner(tenant_id, assigned_to)
              `)
              .eq('contracts.tenant_id', tenantId)
              .gte('due_date', period_start)
              .lte('due_date', period_end);

            // Apply user-level filtering
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