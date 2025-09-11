import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, CheckCircle, Circle, Calendar, User, MessageSquare, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { TodoForm } from '@/components/todos/TodoForm';
import { CreateActivityModal } from '@/components/modals/CreateActivityModal';
import { format } from 'date-fns';

interface Activity {
  id: string;
  type: 'todo' | 'activity';
  title: string;
  description?: string;
  activity_type?: string;
  due_date?: string;
  completed?: boolean;
  completed_at?: string;
  assigned_user?: {
    first_name: string;
    last_name: string;
  };
  created_user: {
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

interface LeadActivitiesProps {
  entityId: string;
  entityType: 'contact' | 'company' | 'site' | 'customer' | 'deal';
  entityName: string;
}

export const LeadActivities = ({ entityId, entityType, entityName }: LeadActivitiesProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchActivities = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      const allActivities: Activity[] = [];

      // Fetch activity logs
      const { data: activityLogs, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;

      // Get user data for activity logs
      for (const log of activityLogs || []) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', log.created_by)
          .single();

        if (userData) {
          allActivities.push({
            id: log.id,
            type: 'activity',
            title: log.title,
            description: log.description,
            activity_type: log.activity_type,
            created_user: userData,
            created_at: log.created_at,
          });
        }
      }

      // Fetch todos (activities with type task)
      const { data: todos, error: todoError } = await supabase
        .from('activities')
        .select('*')
        .eq(`${entityType}_id`, entityId)
        .in('type', ['task', 'call', 'meeting', 'email'])
        .order('created_at', { ascending: false });

      if (todoError) throw todoError;

      // Get user data for todos
      for (const todo of todos || []) {
        const { data: createdUser } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', todo.created_by)
          .single();

        const assignedUser = todo.assigned_to ? await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', todo.assigned_to)
          .single() : null;

        if (createdUser) {
          allActivities.push({
            id: todo.id,
            type: 'todo',
            title: todo.title,
            description: todo.description,
            due_date: todo.due_date,
            completed: todo.completed,
            completed_at: todo.completed_at,
            assigned_user: assignedUser?.data || undefined,
            created_user: createdUser,
            created_at: todo.created_at,
          });
        }
      }

      // Sort by created_at descending
      allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTodoComplete = async (activityId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ 
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq('id', activityId);

      if (error) throw error;

      await fetchActivities();
      toast({
        title: 'Success',
        description: `Todo ${!completed ? 'completed' : 'reopened'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [entityId, entityType, currentTenant]);

  const getActivityIcon = (activity: Activity) => {
    if (activity.type === 'todo') {
      return activity.completed ? CheckCircle : Circle;
    }
    return MessageSquare;
  };

  const getActivityTypeColor = (activityType?: string) => {
    switch (activityType) {
      case 'call': return 'bg-blue-500';
      case 'meeting': return 'bg-green-500';
      case 'email': return 'bg-purple-500';
      case 'follow_up': return 'bg-orange-500';
      case 'note': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p>Loading activities...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Activities & To-Dos
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setActivityModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Log Activity
              </Button>
              <Button size="sm" onClick={() => setTodoModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add To-Do
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activities or to-dos yet</p>
              <p className="text-sm text-muted-foreground">Add your first activity or create a to-do to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {activities.map((activity, index) => {
                  const IconComponent = getActivityIcon(activity);
                  
                  return (
                    <div key={activity.id}>
                      <div className="flex items-start gap-3">
                        <div className={`p-1 rounded-full ${
                          activity.type === 'todo' 
                            ? activity.completed ? 'bg-green-100' : 'bg-gray-100'
                            : 'bg-blue-100'
                        }`}>
                          <IconComponent 
                            className={`h-4 w-4 ${
                              activity.type === 'todo'
                                ? activity.completed ? 'text-green-600' : 'text-gray-600'
                                : 'text-blue-600'
                            } ${activity.type === 'todo' ? 'cursor-pointer' : ''}`}
                            onClick={activity.type === 'todo' ? () => toggleTodoComplete(activity.id, activity.completed!) : undefined}
                          />
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${activity.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {activity.title}
                            </span>
                            {activity.activity_type && (
                              <Badge 
                                variant="secondary" 
                                className={`text-white text-xs ${getActivityTypeColor(activity.activity_type)}`}
                              >
                                {activity.activity_type}
                              </Badge>
                            )}
                          </div>
                          
                          {activity.description && (
                            <p className={`text-sm text-muted-foreground ${activity.completed ? 'line-through' : ''}`}>
                              {activity.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {activity.type === 'todo' && activity.assigned_user ? 
                                `${activity.assigned_user.first_name} ${activity.assigned_user.last_name}` :
                                `${activity.created_user.first_name} ${activity.created_user.last_name}`
                              }
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(activity.created_at), 'MMM d, yyyy HH:mm')}
                            </div>
                            
                            {activity.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {format(new Date(activity.due_date), 'MMM d, yyyy')}
                              </div>
                            )}
                            
                            {activity.completed_at && (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                Completed: {format(new Date(activity.completed_at), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {index < activities.length - 1 && <Separator className="mt-4" />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <TodoForm
        entityType={entityType}
        entityId={entityId}
        onSuccess={fetchActivities}
        trigger={
          <Button variant="outline" onClick={() => setTodoModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add To-Do
          </Button>
        }
        defaultOpen={todoModalOpen}
      />

      <CreateActivityModal
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        onSuccess={fetchActivities}
        entityId={entityId}
        entityType={entityType}
        entityName={entityName}
      />
    </>
  );
};