import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Play, Settings } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';

interface Report {
  id: string;
  name: string;
  description: string;
  data_source: string;
  visualization_type: string;
  visibility: string;
  created_at: string;
  created_by: string;
}

export default function Reports() {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) {
      loadReports();
    }
  }, [currentTenant]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      
      setReports(reports.filter(r => r.id !== reportId));
      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  const handleCreateWidget = async (reportId: string, reportName: string, isGlobal = false) => {
    try {
      // Create a report widget
      const { data: reportWidget, error: widgetError } = await supabase
        .from('report_widgets')
        .insert({
          report_id: reportId,
          tenant_id: currentTenant?.id,
          name: `${reportName} Widget`,
          is_global: isGlobal,
          created_by: user?.id,
        })
        .select()
        .single();

      if (widgetError) throw widgetError;

      if (!isGlobal) {
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
      }

      toast.success(
        isGlobal 
          ? 'Global widget created - available to all tenants'
          : 'Report widget created and added to dashboard'
      );
    } catch (error) {
      console.error('Error creating widget:', error);
      toast.error('Failed to create widget');
    }
  };

  const formatFieldName = (field: string) => {
    return field.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getVisualizationBadgeColor = (type: string) => {
    switch (type) {
      case 'table': return 'default';
      case 'bar_chart': return 'secondary';
      case 'pie_chart': return 'outline';
      case 'kpi_cards': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">Create and manage custom reports</p>
          </div>
          
          {hasPermission('reports_create') && (
            <Button onClick={() => navigate('/reports/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="text-lg font-medium mb-2">No Reports Found</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Get started by creating your first custom report
              </p>
              {hasPermission('reports_create') && (
                <Button onClick={() => navigate('/reports/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Report
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.description || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">
                      {formatFieldName(report.data_source)}
                    </Badge>
                    <Badge variant={getVisualizationBadgeColor(report.visualization_type) as any}>
                      {formatFieldName(report.visualization_type)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/reports/run/${report.id}`)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Run
                    </Button>
                    
                    {hasPermission('reports_update') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/reports/${report.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1" />
                          Widget
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Dashboard Widget</DialogTitle>
                          <DialogDescription>
                            Add this report as a widget to your dashboard or make it available globally.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-3">
                          <Button
                            onClick={() => handleCreateWidget(report.id, report.name, false)}
                            className="justify-start"
                          >
                            Add to My Dashboard
                          </Button>
                          
                          {hasPermission('admin') && (
                            <Button
                              onClick={() => handleCreateWidget(report.id, report.name, true)}
                              variant="outline"
                              className="justify-start"
                            >
                              Create Global Widget (All Tenants)
                            </Button>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {hasPermission('reports_delete') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}