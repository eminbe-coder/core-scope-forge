import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Download, Calendar } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportVisualization } from '@/components/reports/ReportVisualization';
import { ReportExport } from '@/components/reports/ReportExport';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';

interface Report {
  id: string;
  name: string;
  description: string;
  data_source: string;
  visualization_type: string;
  query_config: any;
  created_at: string;
}

export default function ReportRunner() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    if (!id) return;

    try {
      const { data: reportData, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setReport(reportData);
      await runReport(reportData);
    } catch (error) {
      console.error('Error loading report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report',
        variant: 'destructive',
      });
      navigate('/reports');
    } finally {
      setReportLoading(false);
    }
  };

  const runReport = async (reportData?: Report) => {
    const reportToRun = reportData || report;
    if (!reportToRun || !currentTenant) return;

    setLoading(true);
    try {
      const queryConfig = reportToRun.query_config;
      
      // Build the query dynamically based on the config
      let query = supabase
        .from(reportToRun.data_source as any)
        .select(queryConfig.fields.join(', ')) as any;

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

      // Add tenant filter if the table has tenant_id
      if (['contacts', 'companies', 'deals', 'sites', 'customers'].includes(reportToRun.data_source)) {
        query = query.eq('tenant_id', currentTenant.id);
      }

      const { data: queryData, error } = await query;
      if (error) throw error;

      setData(queryData || []);
    } catch (error) {
      console.error('Error running report:', error);
      toast({
        title: 'Error',
        description: 'Failed to run report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (reportLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading report...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Report Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested report could not be found.
            </p>
            <Button onClick={() => navigate('/reports')}>
              Back to Reports
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{report.name}</h1>
            {report.description && (
              <p className="text-muted-foreground">{report.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => runReport()} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              {loading ? 'Running...' : 'Refresh'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/reports/${report.id}/edit`)}
            >
              Edit Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Report Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportVisualization
                  data={data}
                  fields={report.query_config.fields || []}
                  visualizationType={report.visualization_type}
                  dataSource={report.data_source}
                  loading={loading}
                  queryConfig={report.query_config || {}}
                />
              </CardContent>
            </Card>
          </div>

          <div>
            <ReportExport
              reportId={report.id}
              reportName={report.name}
              data={data}
              fields={report.query_config.fields || []}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Data Source:</span>
              <p className="text-muted-foreground">
                {report.data_source.charAt(0).toUpperCase() + report.data_source.slice(1)}
              </p>
            </div>
            <div>
              <span className="font-medium">Visualization:</span>
              <p className="text-muted-foreground">
                {report.visualization_type.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </p>
            </div>
            <div>
              <span className="font-medium">Fields:</span>
              <p className="text-muted-foreground">
                {report.query_config.fields?.length || 0} fields selected
              </p>
            </div>
            <div>
              <span className="font-medium">Created:</span>
              <p className="text-muted-foreground">
                {new Date(report.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}