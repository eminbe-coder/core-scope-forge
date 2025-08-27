import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar, MessageSquare, FileText, CheckSquare, Phone, Mail, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface Activity {
  id: string;
  title: string;
  description?: string;
  type: string;
  created_at: string;
  created_by: string;
  due_date?: string;
  completed?: boolean;
}

interface DealActivitiesProps {
  dealId: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'call':
      return <Phone className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'meeting':
      return <Calendar className="h-4 w-4" />;
    case 'note':
      return <MessageSquare className="h-4 w-4" />;
    case 'task':
      return <CheckSquare className="h-4 w-4" />;
    case 'file':
      return <FileText className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'call':
      return 'bg-green-500';
    case 'email':
      return 'bg-blue-500';
    case 'meeting':
      return 'bg-purple-500';
    case 'note':
      return 'bg-gray-500';
    case 'task':
      return 'bg-orange-500';
    case 'file':
      return 'bg-indigo-500';
    default:
      return 'bg-gray-500';
  }
};

export const DealActivities = ({ dealId }: DealActivitiesProps) => {
  const { currentTenant } = useTenant();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    if (!dealId || !currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          title,
          description,
          type,
          created_at,
          created_by,
          due_date,
          completed
        `)
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

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
  }, [dealId, currentTenant]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading activities...</div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activities logged yet.</p>
            <p className="text-xs text-muted-foreground mt-2">
              Activities will appear here when you log interactions, make changes to the deal, or create tasks.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <Card key={activity.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center text-white`}>
                  {getActivityIcon(activity.type)}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{activity.title}</h4>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant="outline" className="text-xs">
                      {activity.type}
                    </Badge>
                    {activity.completed !== undefined && (
                      <Badge 
                        variant={activity.completed ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {activity.completed ? 'Completed' : 'Pending'}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(activity.created_at).toLocaleString()}</span>
                  </div>
                  
                  {activity.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Due: {new Date(activity.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-xs">
                        {activity.created_by.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>User</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};