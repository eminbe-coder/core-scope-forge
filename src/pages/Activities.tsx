import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/hooks/use-auth';
import { Plus, Search, Activity, Phone, Mail, Calendar, CheckSquare, FileText } from 'lucide-react';

interface ActivityItem {
  id: string;
  tenant_id: string;
  type: 'note' | 'email' | 'call' | 'meeting' | 'task' | 'deal_updated' | 'customer_updated' | 'project_updated' | 'task_completed' | 'follow_up';
  title: string;
  description?: string;
  customer_id?: string;
  deal_id?: string;
  project_id?: string;
  contact_id?: string;
  site_id?: string;
  assigned_to?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  created_by: string;
  customers: {
    name: string;
  } | null;
  deals: {
    name: string;
  } | null;
  projects: {
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
  note: FileText,
  deal_updated: FileText,
  customer_updated: FileText,
  project_updated: FileText,
  task_completed: CheckSquare,
  follow_up: Activity,
};

const activityColors = {
  call: 'bg-blue-500',
  email: 'bg-green-500',
  meeting: 'bg-purple-500',
  task: 'bg-orange-500',
  note: 'bg-gray-500',
  deal_updated: 'bg-cyan-500',
  customer_updated: 'bg-teal-500',
  project_updated: 'bg-indigo-500',
  task_completed: 'bg-emerald-500',
  follow_up: 'bg-yellow-500',
};

const Activities = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { getVisibilityLevel } = usePermissions();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchActivities = async () => {
    if (!currentTenant || !user) return;

    try {
      // Get user's visibility level for activities
      const visibilityLevel = await getVisibilityLevel('activities');
      
      let query = supabase
        .from('activities')
        .select(`
          *,
          customers(name),
          deals(name),
          projects(name)
        `)
        .eq('tenant_id', currentTenant.id);

      // Apply visibility filtering
      if (visibilityLevel === 'own') {
        query = query.eq('created_by', user.id);
      } else if (visibilityLevel === 'department') {
        // Add department filtering when available
      } else if (visibilityLevel === 'branch') {
        // Add branch filtering when available
      }
      // 'all' and 'selected_users' show all records for now

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [currentTenant, user]);

  const filteredActivities = activities.filter(activity =>
    activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.customers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.deals?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading activities...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Activities</h1>
            <p className="text-muted-foreground">
              Track your CRM activities and tasks
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Activity
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No activities found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Start tracking your interactions and tasks by creating your first activity.
              </p>
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Activity
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => {
              const Icon = activityIcons[activity.type];
              return (
                <Card key={activity.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${activityColors[activity.type]}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{activity.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                            {activity.completed && (
                              <Badge variant="default" className="text-xs bg-green-500">
                                Completed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {activity.due_date && (
                        <div className="text-sm text-muted-foreground">
                          Due: {new Date(activity.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {activity.description && (
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {activity.customers && (
                          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Customer: {activity.customers.name}
                          </span>
                        )}
                        {activity.deals && (
                          <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                            Deal: {activity.deals.name}
                          </span>
                        )}
                        {activity.projects && (
                          <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Project: {activity.projects.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Activities;