import { useState } from 'react';
import { Plus, BarChart3, Edit2, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Report {
  id: string;
  name: string;
  description: string;
  data_source: string;
  visibility: string;
  created_at: string;
  created_by: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function Reports() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: reports = [], refetch } = useQuery({
    queryKey: ['reports', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant) return [];
      
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!currentTenant?.id,
  });

  const handleDeleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ active: false })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Report deleted successfully',
      });
      
      refetch();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete report',
        variant: 'destructive',
      });
    }
  };

  const getDataSourceLabel = (source: string) => {
    return source.charAt(0).toUpperCase() + source.slice(1);
  };

  const getVisibilityBadge = (visibility: string) => {
    return visibility === 'private' ? (
      <Badge variant="secondary">Private</Badge>
    ) : (
      <Badge variant="default">Tenant-wide</Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Report Engine</h1>
            <p className="text-muted-foreground">Create and manage custom reports</p>
          </div>
          <Link to="/reports/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No reports yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first custom report to get started
                </p>
                <Link to="/reports/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Report
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Data Source</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.name}</div>
                          {report.description && (
                            <div className="text-sm text-muted-foreground">
                              {report.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getDataSourceLabel(report.data_source)}</TableCell>
                      <TableCell>{getVisibilityBadge(report.visibility)}</TableCell>
                      <TableCell>
                        Unknown User
                      </TableCell>
                      <TableCell>
                        {new Date(report.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/reports/${report.id}/run`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to={`/reports/${report.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Report</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{report.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteReport(report.id)}
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