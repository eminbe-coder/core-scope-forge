import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportVisualization } from '@/components/reports/ReportVisualization';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Loader2 } from 'lucide-react';

interface ReportWidgetProps {
  config: {
    id: string;
    report_widget_id?: string;
    settings?: {
      reportId?: string;
      reportName?: string;
    };
  };
  onUpdateConfig?: (updates: any) => void;
  customizeMode?: boolean;
}

export function ReportWidget({ config }: ReportWidgetProps) {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [reportInfo, setReportInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config.report_widget_id && currentTenant) {
      loadReportData();
    }
  }, [config.report_widget_id, currentTenant]);

  if (!config.report_widget_id) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">No Report Widget</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This widget is not properly configured.
          </p>
        </CardContent>
      </Card>
    );
  }

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the report widget info
      const { data: reportWidget, error: widgetError } = await supabase
        .from('report_widgets')
        .select(`
          *,
          reports(
            id,
            name,
            description,
            data_source,
            query_config,
            visualization_type
          )
        `)
        .eq('id', config.report_widget_id)
        .single();

      if (widgetError || !reportWidget) {
        console.error('Error loading report widget:', widgetError);
        setError('Failed to load report widget');
        return;
      }

      // Type assertion to handle the Supabase response properly
      const typedReportWidget = reportWidget as {
        reports: {
          id: string;
          name: string;
          description: string;
          data_source: string;
          query_config: any;
          visualization_type: string;
        };
      };

      const report = typedReportWidget.reports;
      if (!report) {
        setError('Report not found for this widget');
        return;
      }
      setReportInfo(report);

      // Generate report data using the edge function
      const { data: reportData, error: dataError } = await supabase.functions.invoke(
        'generate-report-data',
        {
          body: {
            dataSource: report.data_source,
            queryConfig: report.query_config || { fields: [], filters: [], sorting: [] },
            tenantId: currentTenant.id,
          },
        }
      );

      if (dataError) {
        console.error('Error generating report data:', dataError);
        setError('Failed to generate report data');
        return;
      }

      setData(reportData.data || []);
    } catch (err) {
      console.error('Error in loadReportData:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">Report Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Loading Report...</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!reportInfo) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Report Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The report for this widget could not be found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">{reportInfo.name}</CardTitle>
        {reportInfo.description && (
          <p className="text-xs text-muted-foreground">{reportInfo.description}</p>
        )}
      </CardHeader>
      <CardContent className="h-full">
        <div className="h-full min-h-[200px]">
          <ReportVisualization
            data={data}
            fields={reportInfo.query_config?.fields || []}
            visualizationType={reportInfo.visualization_type || 'table'}
            dataSource={reportInfo.data_source}
            loading={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}