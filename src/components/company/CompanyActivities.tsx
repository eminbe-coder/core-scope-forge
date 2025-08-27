import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Activity, Phone, Mail, Calendar, CheckSquare, FileText } from 'lucide-react';

interface ActivityLog {
  id: string;
  title: string;
  description?: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  created_by: string;
  created_at: string;
  created_user?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface CompanyActivitiesProps {
  companyId: string;
}

const activityIcons = {
  updated: FileText,
  contact_added: Activity,
  contact_removed: Activity,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
  note: FileText,
};

export function CompanyActivities({ companyId }: CompanyActivitiesProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTenant } = useTenant();

  useEffect(() => {
    fetchActivities();
  }, [companyId, currentTenant]);

  const fetchActivities = async () => {
    if (!currentTenant || !companyId) return;

    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('entity_type', 'company')
        .eq('entity_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities((data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        activity_type: item.activity_type,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        created_by: item.created_by,
        created_at: item.created_at,
        created_user: null, // We'll skip user info for now
      })));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    const IconComponent = activityIcons[activityType as keyof typeof activityIcons] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading activities...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activities recorded for this company yet.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">{activity.title}</h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {activity.activity_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>
                  </div>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {activity.description}
                    </p>
                  )}
                  {activity.created_user && (
                    <p className="text-xs text-muted-foreground mt-1">
                      by {activity.created_user.first_name} {activity.created_user.last_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}