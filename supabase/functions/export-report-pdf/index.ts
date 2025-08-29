import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  reportId: string;
  data: any[];
  fields: string[];
  reportName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId, data, fields, reportName }: ExportRequest = await req.json();

    // Create HTML table for PDF generation
    const tableHTML = generateTableHTML(data, fields, reportName);
    
    // For now, we'll return the HTML content
    // In a production environment, you would use a service like Puppeteer or jsPDF
    // to convert HTML to PDF and upload to storage
    
    const response = {
      success: true,
      html: tableHTML,
      message: 'PDF generation started. In production, this would generate a PDF file.',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in export-report-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

function generateTableHTML(data: any[], fields: string[], reportName: string): string {
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
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h1>${reportName}</h1>
      <div class="meta">
        Generated on: ${new Date().toLocaleString()}<br>
        Total Records: ${data.length}
      </div>
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => 
            `<tr>
              ${fields.map(field => `<td>${formatValue(row[field], field)}</td>`).join('')}
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

serve(handler);