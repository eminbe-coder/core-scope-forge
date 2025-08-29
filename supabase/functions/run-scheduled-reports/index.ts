import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from 'npm:resend@2.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledReport {
  id: string;
  name: string;
  schedule_type: string;
  email_recipients: string[];
  report_id: string;
  tenant_id: string;
  user_id: string;
  reports: {
    name: string;
    data_source: string;
    query_config: any;
    visualization_type: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running scheduled reports...');

    // Get all active scheduled reports that are due
    const { data: scheduledReports, error: fetchError } = await supabase
      .from('scheduled_reports')
      .select(`
        *,
        reports (
          name,
          data_source,
          query_config,
          visualization_type
        )
      `)
      .eq('is_active', true)
      .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`);

    if (fetchError) {
      console.error('Error fetching scheduled reports:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${scheduledReports?.length || 0} scheduled reports to process`);

    const results = [];

    for (const scheduledReport of scheduledReports || []) {
      try {
        const result = await processScheduledReport(scheduledReport as any);
        results.push(result);
      } catch (error) {
        console.error(`Error processing scheduled report ${scheduledReport.id}:`, error);
        results.push({
          id: scheduledReport.id,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in run-scheduled-reports function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

async function processScheduledReport(scheduledReport: ScheduledReport) {
  console.log(`Processing scheduled report: ${scheduledReport.name}`);

  const report = scheduledReport.reports;
  const queryConfig = report.query_config;

  // Build and execute the query
  let query = supabase.from(report.data_source).select(queryConfig.fields.join(', '));

  // Apply filters
  if (queryConfig.filters) {
    queryConfig.filters.forEach((filter: any) => {
      switch (filter.operator) {
        case 'equals':
          query = query.eq(filter.field, filter.value);
          break;
        case 'not_equals':
          query = query.neq(filter.field, filter.value);
          break;
        case 'contains':
          query = query.ilike(filter.field, `%${filter.value}%`);
          break;
        case 'greater_than':
          query = query.gt(filter.field, filter.value);
          break;
        case 'less_than':
          query = query.lt(filter.field, filter.value);
          break;
      }
    });
  }

  // Apply sorting
  if (queryConfig.sorting) {
    queryConfig.sorting.forEach((sort: any) => {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });
    });
  }

  // Add tenant filter
  query = query.eq('tenant_id', scheduledReport.tenant_id);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Query execution failed: ${error.message}`);
  }

  // Generate report content
  const reportHTML = generateReportHTML(data || [], queryConfig.fields, report.name);

  // Send emails to recipients
  const emailResults = [];
  for (const recipient of scheduledReport.email_recipients) {
    try {
      const emailResult = await resend.emails.send({
        from: 'Reports <noreply@reports.com>',
        to: [recipient],
        subject: `Scheduled Report: ${scheduledReport.name}`,
        html: generateEmailHTML(scheduledReport.name, report.name, data?.length || 0, reportHTML),
      });
      
      emailResults.push({ recipient, success: true, id: emailResult.data?.id });
      console.log(`Email sent to ${recipient}:`, emailResult.data?.id);
    } catch (emailError) {
      console.error(`Failed to send email to ${recipient}:`, emailError);
      emailResults.push({ recipient, success: false, error: emailError.message });
    }
  }

  // Update the scheduled report's next run time
  const nextRunTime = calculateNextRunTime(scheduledReport.schedule_type);
  await supabase
    .from('scheduled_reports')
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunTime,
    })
    .eq('id', scheduledReport.id);

  return {
    id: scheduledReport.id,
    success: true,
    recordCount: data?.length || 0,
    emailResults,
  };
}

function calculateNextRunTime(scheduleType: string): string {
  const now = new Date();
  const nextRun = new Date(now);

  switch (scheduleType) {
    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(now.getMonth() + 1);
      break;
    default:
      nextRun.setDate(now.getDate() + 1); // Default to daily
  }

  return nextRun.toISOString();
}

function generateReportHTML(data: any[], fields: string[], reportName: string): string {
  const headers = fields.map(field => 
    field.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  );

  const formatValue = (value: any, field: string) => {
    if (value === null || value === undefined) return '-';
    
    if (field.includes('date') || field.includes('created_at') || field.includes('updated_at')) {
      return new Date(value).toLocaleDateString();
    }
    
    if (field === 'value' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    }
    
    return String(value);
  };

  return `
    <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          ${headers.map(header => `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.slice(0, 50).map((row, index) => 
          `<tr style="background-color: ${index % 2 === 0 ? '#fff' : '#f9f9f9'};">
            ${fields.map(field => `<td style="border: 1px solid #ddd; padding: 8px;">${formatValue(row[field], field)}</td>`).join('')}
          </tr>`
        ).join('')}
      </tbody>
    </table>
    ${data.length > 50 ? `<p style="margin-top: 10px; color: #666; font-size: 12px;">Showing first 50 rows of ${data.length} total records.</p>` : ''}
  `;
}

function generateEmailHTML(scheduleName: string, reportName: string, recordCount: number, reportTable: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Scheduled Report: ${scheduleName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 800px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">${scheduleName}</h1>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; color: #495057;">Report Summary</h2>
          <p style="margin: 5px 0;"><strong>Report:</strong> ${reportName}</p>
          <p style="margin: 5px 0;"><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin: 5px 0;"><strong>Total Records:</strong> ${recordCount}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="color: #333; margin-bottom: 15px;">Report Data</h3>
          ${reportTable}
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          <p>This is an automated report generated by your Report Engine.</p>
          <p>If you no longer wish to receive these reports, please contact your administrator.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);