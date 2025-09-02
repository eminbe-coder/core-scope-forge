import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Play, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QueryBuilder } from '@/components/reports/QueryBuilder';
import { ReportVisualization } from '@/components/reports/ReportVisualization';
import { ReportExport } from '@/components/reports/ReportExport';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface QueryConfig {
  fields: string[];
  filters: Array<{
    field: string;
    operator: string;
    value: string;
  }>;
  sorting: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  grouping: string[];
  visualization_type: 'table' | 'bar_chart' | 'pie_chart' | 'kpi_cards' | 'comparison_chart';
  comparison_fields?: string[];
}

export default function ReportBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [dataSource, setDataSource] = useState<string>('');
  const [visualizationType, setVisualizationType] = useState<'table' | 'bar_chart' | 'pie_chart' | 'kpi_cards' | 'comparison_chart'>('table');
  const [visibility, setVisibility] = useState<'private' | 'tenant'>('private');
  const [queryConfig, setQueryConfig] = useState<QueryConfig>({
    fields: [],
    filters: [],
    sorting: [],
    grouping: [],
    visualization_type: 'table',
    comparison_fields: [],
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    if (!id || id === 'new') return;

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setReportName(data.name);
      setReportDescription(data.description || '');
      setDataSource(data.data_source);
      setVisualizationType(data.visualization_type as any);
      setVisibility(data.visibility as 'private' | 'tenant');
      setQueryConfig((data.query_config as any) as QueryConfig);
    } catch (error) {
      console.error('Error loading report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load report',
        variant: 'destructive',
      });
      navigate('/reports');
    }
  };

  const handleRunPreview = async () => {
    if (!dataSource || queryConfig.fields.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a data source and at least one field',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Build the query dynamically based on the config
      let query = supabase.from(dataSource as any).select(queryConfig.fields.join(', '));

      // Apply filters
      queryConfig.filters.forEach((filter) => {
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

      // Apply sorting
      queryConfig.sorting.forEach((sort) => {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      });

      // Add tenant filter if the table has tenant_id
      if (currentTenant && ['contacts', 'companies', 'deals', 'sites', 'customers'].includes(dataSource)) {
        query = query.eq('tenant_id', currentTenant.id);
      }

      // Limit results for preview
      query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;

      setPreviewData(data || []);
    } catch (error) {
      console.error('Error running preview:', error);
      toast({
        title: 'Error',
        description: 'Failed to run preview',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName || !dataSource || queryConfig.fields.length === 0) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const reportData = {
        name: reportName,
        description: reportDescription,
        data_source: dataSource,
        visualization_type: visualizationType,
        query_config: { ...queryConfig, visualization_type: visualizationType } as any,
        visibility,
        tenant_id: currentTenant?.id,
        created_by: user?.id,
      };

      if (id && id !== 'new') {
        const { error } = await supabase
          .from('reports')
          .update(reportData)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reports')
          .insert(reportData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: id && id !== 'new' ? 'Report updated successfully' : 'Report created successfully',
      });
      
      navigate('/reports');
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: 'Error',
        description: 'Failed to save report',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWidget = async () => {
    if (!id || id === 'new' || !reportName || !dataSource) {
      toast({
        title: 'Error',
        description: 'Please save the report first before creating a widget',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create a report widget
      const { data: reportWidget, error: widgetError } = await supabase
        .from('report_widgets')
        .insert({
          report_id: id,
          tenant_id: currentTenant?.id,
          name: `${reportName} Widget`,
          description: reportDescription,
          created_by: user?.id,
        })
        .select()
        .single();

      if (widgetError) throw widgetError;

      // Add to user's dashboard
      const { error: dashboardError } = await supabase
        .from('user_dashboard_configs')
        .insert({
          user_id: user?.id,
          widget_id: 'report',
          report_widget_id: reportWidget.id,
          position_x: 0,
          position_y: 0,
          width: 6,
          height: 4,
          active: true,
        });

      if (dashboardError) throw dashboardError;

      toast({
        title: 'Success',
        description: 'Report widget created and added to dashboard',
      });
    } catch (error) {
      console.error('Error creating widget:', error);
      toast({
        title: 'Error',
        description: 'Failed to create widget',
        variant: 'destructive',
      });
    }
  };

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
          <div>
            <h1 className="text-3xl font-bold">
              {id && id !== 'new' ? 'Edit Report' : 'New Report'}
            </h1>
            <p className="text-muted-foreground">Build custom reports with dynamic queries</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Report Name *</Label>
                  <Input
                    id="name"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Enter report name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="Enter report description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={visibility} onValueChange={(value: 'private' | 'tenant') => setVisibility(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private (Only me)</SelectItem>
                      <SelectItem value="tenant">Tenant-wide (All users)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <QueryBuilder
              dataSource={dataSource}
              onDataSourceChange={setDataSource}
              queryConfig={queryConfig}
              onQueryConfigChange={setQueryConfig}
              visualizationType={visualizationType}
              onVisualizationTypeChange={(type: any) => setVisualizationType(type)}
            />

            <div className="flex gap-2">
              <Button onClick={handleRunPreview} disabled={loading}>
                <Play className="h-4 w-4 mr-2" />
                {loading ? 'Running...' : 'Run Preview'}
              </Button>
              <Button onClick={handleSaveReport} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Report'}
              </Button>
              {id && id !== 'new' && (
                <Button onClick={handleCreateWidget} variant="outline">
                  Add to Dashboard
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <ReportVisualization
              data={previewData}
              fields={queryConfig.fields}
              visualizationType={visualizationType}
              dataSource={dataSource}
              loading={loading}
              queryConfig={queryConfig}
            />
            
            <ReportExport
              reportId={id !== 'new' ? id : undefined}
              reportName={reportName}
              data={previewData}
              fields={queryConfig.fields}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}