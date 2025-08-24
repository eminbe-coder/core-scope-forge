import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Plus, Search, FolderKanban, Calendar, DollarSign } from 'lucide-react';
import { CreateProjectForm } from '@/components/forms/CreateProjectForm';

interface Project {
  id: string;
  name: string;
  description: string;
  type: 'BOQ' | 'lighting_calculation' | 'general' | 'lighting_control' | 'elv' | 'home_automation';
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'active';
  start_date: string;
  end_date: string;
  budget: number;
  deals: {
    name: string;
  } | null;
  currencies: {
    symbol: string;
  } | null;
  created_at: string;
}

const statusColors = {
  planning: 'bg-blue-500',
  in_progress: 'bg-green-500',
  active: 'bg-green-500',
  on_hold: 'bg-yellow-500',
  completed: 'bg-gray-500',
  cancelled: 'bg-red-500',
};

const typeColors = {
  BOQ: 'bg-purple-500',
  lighting_calculation: 'bg-orange-500',
  general: 'bg-blue-500',
  lighting_control: 'bg-indigo-500',
  elv: 'bg-emerald-500',
  home_automation: 'bg-pink-500',
};

const Projects = () => {
  const { currentTenant } = useTenant();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchProjects = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          deals(name),
          currencies(symbol)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentTenant]);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.deals?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading projects...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              Manage your projects and deliverables
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Start managing your work by creating your first project.
              </p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Badge 
                        className={`text-white ${typeColors[project.type]} text-xs`}
                        variant="secondary"
                      >
                        {project.type.replace('_', ' ')}
                      </Badge>
                      <Badge 
                        className={`text-white ${statusColors[project.status]}`}
                        variant="secondary"
                      >
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    {project.budget && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">
                          {project.currencies?.symbol || '$'}{project.budget.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {project.deals && (
                      <p className="text-sm text-muted-foreground">
                        Deal: {project.deals.name}
                      </p>
                    )}
                    {(project.start_date || project.end_date) && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {project.start_date && new Date(project.start_date).toLocaleDateString()}
                          {project.start_date && project.end_date && ' - '}
                          {project.end_date && new Date(project.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <CreateProjectForm
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSuccess={fetchProjects}
        />
      </div>
    </DashboardLayout>
  );
};

export default Projects;