import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { BOQEditor } from '@/components/projects/BOQEditor';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  FolderKanban, 
  Calendar, 
  DollarSign,
  FileText,
  Link2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Project {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  deals: { id: string; name: string } | null;
  currencies: { symbol: string; code: string } | null;
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-500',
  in_progress: 'bg-green-500',
  active: 'bg-green-500',
  on_hold: 'bg-yellow-500',
  completed: 'bg-gray-500',
  cancelled: 'bg-red-500',
};

const typeColors: Record<string, string> = {
  BOQ: 'bg-purple-500',
  lighting_calculation: 'bg-orange-500',
  general: 'bg-blue-500',
  lighting_control: 'bg-indigo-500',
  elv: 'bg-emerald-500',
  home_automation: 'bg-pink-500',
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id, currentTenant]);

  const fetchProject = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          deals(id, name),
          currencies(symbol, code)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({ title: 'Error', description: 'Failed to load project', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);

    try {
      // Delete project devices first
      await supabase.from('project_devices').delete().eq('project_id', id);
      
      // Delete project
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Project deleted' });
      navigate('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({ title: 'Error', description: 'Failed to delete project', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FolderKanban className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <Badge className={`text-white ${typeColors[project.type] || 'bg-gray-500'}`}>
                  {project.type.replace('_', ' ')}
                </Badge>
                <Badge className={`text-white ${statusColors[project.status] || 'bg-gray-500'}`}>
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground max-w-2xl">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {project.budget && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Budget
                  </p>
                  <p className="font-semibold text-lg">
                    {project.currencies?.symbol || '$'}{project.budget.toLocaleString()}
                  </p>
                </div>
              )}

              {project.deals && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Related Deal
                  </p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-lg font-semibold"
                    onClick={() => navigate(`/deals/${project.deals?.id}`)}
                  >
                    {project.deals.name}
                  </Button>
                </div>
              )}

              {project.start_date && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </p>
                  <p className="font-semibold">
                    {new Date(project.start_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              {project.end_date && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    End Date
                  </p>
                  <p className="font-semibold">
                    {new Date(project.end_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {project.notes && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
                </div>
              </>
            )}

            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground">
              Created {new Date(project.created_at).toLocaleDateString()} at{' '}
              {new Date(project.created_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        {/* BOQ Editor - Show for BOQ type projects */}
        {project.type === 'BOQ' && (
          <BOQEditor 
            projectId={project.id} 
            project={project}
            onUpdate={fetchProject}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{project.name}" and all associated devices. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;