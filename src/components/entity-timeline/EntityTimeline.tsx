import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  Circle, 
  Calendar, 
  User, 
  Clock, 
  FileText, 
  MessageSquare, 
  Phone, 
  Mail, 
  RefreshCw,
  ListTodo,
  ArrowRight,
  UserPlus,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: string;
  entity_id: string;
  entity_type: string;
  activity_type: string;
  title: string;
  description?: string;
  created_by: string;
  created_at: string;
  created_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

interface EntityTimelineProps {
  entityType: string;
  entityId: string;
  title?: string;
  maxHeight?: string;
  compact?: boolean;
}

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'todo_created':
      return <ListTodo className="h-4 w-4" />;
    case 'todo_completed':
      return <CheckCircle className="h-4 w-4" />;
    case 'todo_status_changed':
      return <RefreshCw className="h-4 w-4" />;
    case 'todo_assigned':
      return <UserPlus className="h-4 w-4" />;
    case 'todo_updated':
      return <Edit className="h-4 w-4" />;
    case 'note':
      return <MessageSquare className="h-4 w-4" />;
    case 'call':
      return <Phone className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'meeting':
      return <Calendar className="h-4 w-4" />;
    case 'file_upload':
      return <FileText className="h-4 w-4" />;
    case 'status_changed':
      return <ArrowRight className="h-4 w-4" />;
    default:
      return <Circle className="h-4 w-4" />;
  }
};

const getActivityColor = (activityType: string) => {
  switch (activityType) {
    case 'todo_created':
      return 'bg-blue-500';
    case 'todo_completed':
      return 'bg-green-500';
    case 'todo_status_changed':
      return 'bg-amber-500';
    case 'todo_assigned':
      return 'bg-purple-500';
    case 'todo_updated':
      return 'bg-slate-500';
    case 'note':
      return 'bg-muted-foreground';
    case 'call':
      return 'bg-green-600';
    case 'email':
      return 'bg-blue-600';
    case 'meeting':
      return 'bg-purple-600';
    case 'file_upload':
      return 'bg-indigo-500';
    case 'status_changed':
      return 'bg-orange-500';
    default:
      return 'bg-muted-foreground';
  }
};

const getActivityLabel = (activityType: string) => {
  switch (activityType) {
    case 'todo_created':
      return 'To-Do Created';
    case 'todo_completed':
      return 'To-Do Completed';
    case 'todo_status_changed':
      return 'Status Changed';
    case 'todo_assigned':
      return 'Assignment Changed';
    case 'todo_updated':
      return 'To-Do Updated';
    case 'note':
      return 'Note';
    case 'call':
      return 'Call';
    case 'email':
      return 'Email';
    case 'meeting':
      return 'Meeting';
    case 'file_upload':
      return 'File Upload';
    case 'status_changed':
      return 'Status Changed';
    case 'lead_converted':
      return 'Lead Converted';
    default:
      return activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

export const EntityTimeline = ({ 
  entityType, 
  entityId, 
  title = "Activity Timeline",
  maxHeight = "400px",
  compact = false
}: EntityTimelineProps) => {
  const { currentTenant } = useTenant();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    if (!currentTenant || !entityId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          entity_id,
          entity_type,
          activity_type,
          title,
          description,
          created_by,
          created_at
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each activity
      const activitiesWithProfiles = await Promise.all(
        (data || []).map(async (activity) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', activity.created_by)
            .single();
          
          return {
            ...activity,
            created_by_profile: profile || undefined
          };
        })
      );

      setActivities(activitiesWithProfiles);
    } catch (error) {
      console.error('Error fetching activity timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [currentTenant, entityType, entityId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className={compact ? "text-base" : undefined}>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Loading timeline...</div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className={compact ? "text-base" : undefined}>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activity recorded yet</p>
            <p className="text-xs text-muted-foreground mt-2">
              Activities will appear here when changes are made
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className={compact ? "text-base" : undefined}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }} className="pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="relative flex gap-4 pl-1">
                  {/* Timeline dot */}
                  <div className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
                    getActivityColor(activity.activity_type)
                  )}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  
                  {/* Content */}
                  <div className={cn(
                    "flex-1 rounded-lg border bg-card p-3",
                    compact ? "py-2" : undefined
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-medium",
                            compact ? "text-sm" : undefined
                          )}>
                            {activity.title}
                          </span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {getActivityLabel(activity.activity_type)}
                          </Badge>
                        </div>
                        
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      
                      {activity.created_by_profile && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>
                            {activity.created_by_profile.first_name} {activity.created_by_profile.last_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
