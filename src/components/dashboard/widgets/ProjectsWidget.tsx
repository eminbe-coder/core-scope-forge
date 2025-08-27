import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FolderKanban, Plus, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { WidgetConfig } from '../DashboardGrid';
import { useNavigate } from 'react-router-dom';

interface ProjectsWidgetProps {
  config: WidgetConfig;
  onUpdateConfig: (updates: Partial<WidgetConfig>) => void;
  customizeMode: boolean;
}

export function ProjectsWidget({ config, onUpdateConfig, customizeMode }: ProjectsWidgetProps) {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const filterType = config.filters?.type || 'active';

  useEffect(() => {
    if (currentTenant) {
      loadProjects();
    }
  }, [currentTenant, filterType]);

  const loadProjects = async () => {
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('tenant_id', currentTenant?.id);

      if (filterType === 'active') {
        query = query.in('status', ['planning', 'active']);
      } else if (filterType === 'completed') {
        query = query.eq('status', 'completed');
      } else if (filterType === 'cancelled') {
        query = query.eq('status', 'cancelled');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (newFilterType: string) => {
    onUpdateConfig({
      filters: { ...config.filters, type: newFilterType }
    });
  };

  const getTitle = () => {
    switch (filterType) {
      case 'active': return 'Active Projects';
      case 'completed': return 'Completed Projects';
      case 'cancelled': return 'Cancelled Projects';
      default: return 'Projects';
    }
  };

  const getCount = () => {
    return projects.length;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      planning: 'Planning',
      active: 'Active',
      on_hold: 'On Hold',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FolderKanban className="h-4 w-4" />
          {getTitle()}
        </CardTitle>
        
        <div className="flex items-center gap-1">
          {(customizeMode || showFilters) && (
            <Select value={filterType} onValueChange={updateFilter}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {!customizeMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => navigate('/projects')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-2xl font-bold mb-2">{getCount()}</div>
        
        {!customizeMode && (
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-1">
                {projects.slice(0, 3).map((project) => (
                  <div
                    key={project.id}
                    className="text-xs text-muted-foreground cursor-pointer hover:text-foreground truncate"
                    onClick={() => navigate('/projects')}
                  >
                    {project.name} - {getStatusBadge(project.status)}
                  </div>
                ))}
                {projects.length > 3 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => navigate('/projects')}
                  >
                    View all {projects.length} projects
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No projects found
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}