import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FilterCondition {
  field: string;
  operator: string;
  value: string;
}

interface SortCondition {
  field: string;
  direction: 'asc' | 'desc';
}

interface QueryConfig {
  fields: string[];
  filters: FilterCondition[];
  sorting: SortCondition[];
  grouping: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      supabase.auth.setSession({
        access_token: authHeader.replace('Bearer ', ''),
        refresh_token: ''
      })
    }

    const { dataSource, queryConfig, tenantId } = await req.json()

    console.log('Generating report data for:', { dataSource, tenantId })

    let query;
    let data: any[] = [];

    switch (dataSource) {
      case 'contracts':
        query = supabase
          .from('contracts')
          .select(`
            id,
            name,
            status,
            value,
            signed_date,
            start_date,
            end_date,
            customer_reference_number,
            assigned_to,
            created_at,
            customers!inner(name),
            sites(name),
            currencies(code, symbol),
            profiles(first_name, last_name)
          `)
          .eq('tenant_id', tenantId);

        // Apply filters
        for (const filter of queryConfig.filters) {
          query = applyFilter(query, filter, 'contracts');
        }

        // Apply sorting
        for (const sort of queryConfig.sorting) {
          query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        }

        const { data: contractsData, error: contractsError } = await query;
        if (contractsError) throw contractsError;

        // Transform data to flatten relationships
        data = contractsData.map((contract: any) => ({
          id: contract.id,
          name: contract.name,
          status: contract.status,
          value: contract.value,
          signed_date: contract.signed_date,
          start_date: contract.start_date,
          end_date: contract.end_date,
          customer_reference_number: contract.customer_reference_number,
          assigned_to: contract.assigned_to,
          created_at: contract.created_at,
          customer_name: contract.customers?.name || '',
          site_name: contract.sites?.name || '',
          currency_code: contract.currencies?.code || '',
          assigned_salesperson: contract.profiles ? 
            `${contract.profiles.first_name} ${contract.profiles.last_name}` : ''
        }));
        break;

      case 'contract_payments':
        query = supabase
          .from('contract_payment_terms')
          .select(`
            id,
            contract_id,
            installment_number,
            amount_type,
            amount_value,
            calculated_amount,
            due_date,
            created_at,
            contracts!inner(
              id,
              name,
              customers(name),
              profiles(first_name, last_name),
              currencies(code, symbol)
            ),
            contract_payment_stages(name),
            contract_todos(id, completed)
          `)
          .eq('tenant_id', tenantId);

        // Apply filters
        for (const filter of queryConfig.filters) {
          query = applyFilter(query, filter, 'contract_payment_terms');
        }

        // Apply sorting
        for (const sort of queryConfig.sorting) {
          query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        }

        const { data: paymentsData, error: paymentsError } = await query;
        if (paymentsError) throw paymentsError;

        // Transform data with todo counts
        data = paymentsData.map((payment: any) => {
          const todosList = payment.contract_todos || [];
          const completedTodos = todosList.filter((todo: any) => todo.completed).length;
          const totalTodos = todosList.length;

          return {
            id: payment.id,
            contract_id: payment.contract_id,
            contract_name: payment.contracts?.name || '',
            installment_number: payment.installment_number,
            amount_type: payment.amount_type,
            amount_value: payment.amount_value,
            calculated_amount: payment.calculated_amount,
            due_date: payment.due_date,
            created_at: payment.created_at,
            stage_name: payment.contract_payment_stages?.name || '',
            customer_name: payment.contracts?.customers?.name || '',
            assigned_salesperson: payment.contracts?.profiles ? 
              `${payment.contracts.profiles.first_name} ${payment.contracts.profiles.last_name}` : '',
            currency_code: payment.contracts?.currencies?.code || '',
            todos_count: totalTodos - completedTodos,
            todos_completed_count: completedTodos
          };
        });
        break;

      case 'deals':
        query = supabase
          .from('deals')
          .select(`
            id,
            name,
            value,
            status,
            probability,
            expected_close_date,
            created_at,
            customers(name),
            deal_stages(name),
            currencies(code, symbol),
            profiles(first_name, last_name)
          `)
          .eq('tenant_id', tenantId);

        // Apply filters and sorting for deals
        for (const filter of queryConfig.filters) {
          query = applyFilter(query, filter, 'deals');
        }

        for (const sort of queryConfig.sorting) {
          query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        }

        const { data: dealsData, error: dealsError } = await query;
        if (dealsError) throw dealsError;

        data = dealsData.map((deal: any) => ({
          id: deal.id,
          name: deal.name,
          value: deal.value,
          status: deal.status,
          probability: deal.probability,
          expected_close_date: deal.expected_close_date,
          created_at: deal.created_at,
          customer_name: deal.customers?.name || '',
          stage_name: deal.deal_stages?.name || '',
          currency_code: deal.currencies?.code || '',
          assigned_salesperson: deal.profiles ? 
            `${deal.profiles.first_name} ${deal.profiles.last_name}` : ''
        }));
        break;

      case 'contacts':
      case 'companies':
      case 'sites':
      case 'customers':
        // Handle existing data sources
        query = supabase
          .from(dataSource)
          .select('*')
          .eq('tenant_id', tenantId);

        for (const filter of queryConfig.filters) {
          query = applyFilter(query, filter, dataSource);
        }

        for (const sort of queryConfig.sorting) {
          query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        }

        const { data: genericData, error: genericError } = await query;
        if (genericError) throw genericError;
        data = genericData || [];
        break;

      default:
        throw new Error(`Unsupported data source: ${dataSource}`);
    }

    // Filter fields if specified
    if (queryConfig.fields.length > 0) {
      data = data.map((row: any) => {
        const filteredRow: any = {};
        queryConfig.fields.forEach(field => {
          if (row.hasOwnProperty(field)) {
            filteredRow[field] = row[field];
          }
        });
        return filteredRow;
      });
    }

    console.log(`Generated report data: ${data.length} rows`);

    return new Response(
      JSON.stringify({ data, count: data.length }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error generating report data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function applyFilter(query: any, filter: FilterCondition, tableName: string) {
  const { field, operator, value } = filter;
  
  switch (operator) {
    case 'equals':
      return query.eq(field, value);
    case 'not_equals':
      return query.neq(field, value);
    case 'contains':
      return query.ilike(field, `%${value}%`);
    case 'greater_than':
      return query.gt(field, value);
    case 'less_than':
      return query.lt(field, value);
    case 'greater_than_or_equal':
      return query.gte(field, value);
    case 'less_than_or_equal':
      return query.lte(field, value);
    case 'is_null':
      return query.is(field, null);
    case 'is_not_null':
      return query.not(field, 'is', null);
    case 'in_last_days':
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(value));
      return query.gte(field, daysAgo.toISOString());
    case 'before_date':
      return query.lt(field, value);
    case 'after_date':
      return query.gt(field, value);
    default:
      return query;
  }
}