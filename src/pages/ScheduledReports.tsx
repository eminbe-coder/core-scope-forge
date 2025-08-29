import { useState } from 'react';
import { Calendar, Play, Pause, Trash2, Mail, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface ScheduledReport {
  id: string;
  name: string;
  schedule_type: string;
  email_recipients: string[];
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  reports: {
    name: string;
    data_source: string;
  };
}

export default function ScheduledReports() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const { data: scheduledReports = [], refetch } = useQuery({
    queryKey: ['scheduled-reports', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select(`
          *,
          reports (
            name,
            data_source
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ScheduledReport[];
    },
    enabled: !!currentTenant?.id,
  });

  const handleToggleActive = async (reportId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: !isActive })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Scheduled report ${!isActive ? 'activated' : 'paused'} successfully`,
      });
      
      refetch();
    } catch (error) {
      console.error('Error toggling scheduled report:', error);
      toast({
        title: 'Error',
        description: 'Failed to update scheduled report',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteScheduledReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Scheduled report deleted successfully',
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting scheduled report:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete scheduled report',
        variant: 'destructive',
      });
    }
  };

  const handleRunNow = async (reportId: string) => {
    try {
      const { error } = await supabase.functions.invoke('run-scheduled-reports', {
        body: { reportId },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Report execution started. Emails will be sent shortly.',
      });
    } catch (error) {
      console.error('Error running scheduled report:', error);
      toast({
        title: 'Error',
        description: 'Failed to run scheduled report',
        variant: 'destructive',
      });
    }
  };

  const getScheduleBadge = (scheduleType: string) => {
    const variants: Record<string, any> = {
      daily: 'default',
      weekly: 'secondary',
      monthly: 'outline',
    };
    
    return (
      <Badge variant={variants[scheduleType] || 'default'}>
        {scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean, nextRunAt: string | null) => {
    if (!isActive) {
      return <Badge variant="secondary">Paused</Badge>;
    }
    
    if (!nextRunAt) {
      return <Badge variant="outline">Pending</Badge>;
    }
    
    const nextRun = new Date(nextRunAt);
    const now = new Date();
    
    if (nextRun <= now) {
      return <Badge variant="default">Ready</Badge>;
    }
    
    return <Badge variant="outline">Scheduled</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Scheduled Reports</h1>
            <p className="text-muted-foreground">Manage automated report delivery</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Active Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduledReports.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No scheduled reports</h3>
                <p className="text-muted-foreground mb-4">
                  Create scheduled reports from the Report Builder to automate delivery
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledReports.map((scheduledReport) => (
                    <TableRow key={scheduledReport.id}>
                      <TableCell>
                        <div className="font-medium">{scheduledReport.name}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{scheduledReport.reports.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {scheduledReport.reports.data_source.charAt(0).toUpperCase() + 
                             scheduledReport.reports.data_source.slice(1)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getScheduleBadge(scheduledReport.schedule_type)}</TableCell>
                      <TableCell>
                        {getStatusBadge(scheduledReport.is_active, scheduledReport.next_run_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{scheduledReport.email_recipients.length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {scheduledReport.last_run_at ? (
                          <div className="text-sm">
                            {new Date(scheduledReport.last_run_at).toLocaleDateString()}<br />
                            <span className="text-muted-foreground">
                              {new Date(scheduledReport.last_run_at).toLocaleTimeString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {scheduledReport.next_run_at && scheduledReport.is_active ? (
                          <div className="text-sm">
                            {new Date(scheduledReport.next_run_at).toLocaleDateString()}<br />
                            <span className="text-muted-foreground">
                              {new Date(scheduledReport.next_run_at).toLocaleTimeString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRunNow(scheduledReport.id)}
                            disabled={!scheduledReport.is_active}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(scheduledReport.id, scheduledReport.is_active)}
                          >
                            {scheduledReport.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the schedule "{scheduledReport.name}"? 
                                  This will permanently stop automated delivery of this report.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteScheduledReport(scheduledReport.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}