import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CommissionRequest {
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

    const { tenantId, level, entityId, periodStart, periodEnd }: CommissionRequest = await req.json();

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: 'tenantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calculating commission data for:', { tenantId, level, entityId, periodStart, periodEnd });

    // Get active commission configurations
    const { data: commissionConfigs, error: configError } = await supabaseClient
      .from('commission_configurations')
      .select(`
        *,
        commission_stages(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (configError) throw configError;

    // Get users based on level filter
    let usersQuery = supabaseClient
      .from('profiles')
      .select(`
        id, first_name, last_name,
        user_tenant_memberships!inner(tenant_id, active)
      `)
      .eq('user_tenant_memberships.tenant_id', tenantId)
      .eq('user_tenant_memberships.active', true);

    if (level === 'user' && entityId) {
      usersQuery = usersQuery.eq('id', entityId);
    }

    const { data: users, error: usersError } = await usersQuery;
    if (usersError) throw usersError;

    const commissionData = await Promise.all(
      users.map(async (user) => {
        let totalCommission = 0;
        const commissionBreakdown = [];

        for (const config of commissionConfigs) {
          let commissionEarned = 0;
          let basedOnValue = 0;

          // Calculate commission based on method
          if (config.calculation_method === 'fixed_amount') {
            // Fixed amount per achievement
            let achievementsQuery = supabaseClient
              .from('deals')
              .select('id', { count: 'exact' })
              .eq('tenant_id', tenantId)
              .eq('assigned_to', user.id)
              .in('status', ['won', 'closed']);

            if (periodStart) achievementsQuery = achievementsQuery.gte('updated_at', periodStart);
            if (periodEnd) achievementsQuery = achievementsQuery.lte('updated_at', periodEnd);

            const { count: achievements } = await achievementsQuery;
            commissionEarned = (achievements || 0) * (config.fixed_amount || 0);
            basedOnValue = achievements || 0;

          } else if (config.calculation_method === 'percentage') {
            // Percentage of deals value
            let dealsQuery = supabaseClient
              .from('deals')
              .select('value')
              .eq('tenant_id', tenantId)
              .eq('assigned_to', user.id)
              .in('status', ['won', 'closed']);

            if (periodStart) dealsQuery = dealsQuery.gte('updated_at', periodStart);
            if (periodEnd) dealsQuery = dealsQuery.lte('updated_at', periodEnd);

            const { data: deals } = await dealsQuery;
            const totalValue = deals?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;
            basedOnValue = totalValue;

            // Apply stage-based rates if configured
            if (config.commission_stages && config.commission_stages.length > 0) {
              const stages = config.commission_stages.sort((a, b) => a.sort_order - b.sort_order);
              
              for (const stage of stages) {
                if (totalValue >= stage.min_threshold && 
                    (!stage.max_threshold || totalValue <= stage.max_threshold)) {
                  commissionEarned = totalValue * (stage.commission_rate / 100);
                  break;
                }
              }
            } else {
              commissionEarned = totalValue * ((config.percentage_rate || 0) / 100);
            }

          } else if (config.calculation_method === 'stage_based') {
            // Commission based on deal stages reached
            let stageQuery = supabaseClient
              .from('deals')
              .select(`
                value,
                deal_stages!inner(win_percentage)
              `)
              .eq('tenant_id', tenantId)
              .eq('assigned_to', user.id);

            if (periodStart) stageQuery = stageQuery.gte('updated_at', periodStart);
            if (periodEnd) stageQuery = stageQuery.lte('updated_at', periodEnd);

            const { data: stageDeals } = await stageQuery;
            basedOnValue = stageDeals?.length || 0;

            commissionEarned = stageDeals?.reduce((sum, deal) => {
              const stageRate = (deal.deal_stages?.win_percentage || 0) / 100;
              const dealCommission = (deal.value || 0) * ((config.percentage_rate || 0) / 100) * stageRate;
              return sum + dealCommission;
            }, 0) || 0;
          }

          totalCommission += commissionEarned;

          commissionBreakdown.push({
            configName: config.name,
            configType: config.calculation_method,
            earned: Math.round(commissionEarned * 100) / 100,
            basedOnValue: Math.round(basedOnValue * 100) / 100,
            rate: config.percentage_rate || 0
          });
        }

        return {
          userId: user.id,
          userName: `${user.first_name} ${user.last_name}`,
          totalCommission: Math.round(totalCommission * 100) / 100,
          breakdown: commissionBreakdown
        };
      })
    );

    // Calculate department and branch totals if needed
    const aggregatedData = {
      users: commissionData,
      departmentTotals: {},
      branchTotals: {},
      companyTotal: commissionData.reduce((sum, user) => sum + user.totalCommission, 0)
    };

    return new Response(
      JSON.stringify({ data: aggregatedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating commission data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});