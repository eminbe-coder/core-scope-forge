import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { formatDistanceToNow } from 'date-fns';

interface SiteActivityTimelineProps {
  siteId: string;
}

interface Activity {
  id: string;
  type: 'site' | 'deal' | 'contract' | 'payment' | 'todo';
  title: string;
  description: string;
  entityName?: string;
  entityId?: string;
  userName?: string;
  createdAt: string;
  icon: React.ReactNode;
  color: string;
}

export function SiteActivityTimeline({ siteId }: SiteActivityTimelineProps) {
  const { currentTenant } = useTenant();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant && siteId) {
      fetchActivities();
    }
  }, [currentTenant, siteId]);

  const fetchActivities = async () => {
    try {
      const allActivities: Activity[] = [];

      // Fetch site-specific activities
      const { data: siteActivities } = await supabase
        .from('activity_logs')
        .select(`
          id, title, description, created_at, created_by
        `)
        .eq('entity_type', 'site')
        .eq('entity_id', siteId)
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (siteActivities) {
        siteActivities.forEach(activity => {
          allActivities.push({
            id: activity.id,
            type: 'site',
            title: activity.title,
            description: activity.description,
            userName: 'System User', // Will be enhanced later
            createdAt: activity.created_at,
            icon: <FileText className="h-4 w-4" />,
            color: 'bg-blue-100 text-blue-800',
          });
        });
      }

      // Fetch deal activities for this site
      const { data: dealIds } = await supabase
        .from('deals')
        .select('id, name')
        .eq('site_id', siteId)
        .eq('tenant_id', currentTenant?.id);

      if (dealIds && dealIds.length > 0) {
        const { data: dealActivities } = await supabase
          .from('activity_logs')
          .select(`
            id, title, description, created_at, created_by, entity_id
          `)
          .eq('entity_type', 'deal')
          .in('entity_id', dealIds.map(d => d.id))
          .eq('tenant_id', currentTenant?.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (dealActivities) {
          dealActivities.forEach(activity => {
            const deal = dealIds.find(d => d.id === activity.entity_id);
            allActivities.push({
              id: activity.id,
              type: 'deal',
              title: activity.title,
              description: activity.description,
              entityName: deal?.name,
              entityId: activity.entity_id,
              userName: 'System User', // Will be enhanced later
              createdAt: activity.created_at,
              icon: <DollarSign className="h-4 w-4" />,
              color: 'bg-green-100 text-green-800',
            });
          });
        }
      }

      // Fetch contract activities for this site
      const { data: contractIds } = await supabase
        .from('contracts')
        .select('id, name')
        .eq('site_id', siteId)
        .eq('tenant_id', currentTenant?.id);

      if (contractIds && contractIds.length > 0) {
        const { data: contractActivities } = await supabase
          .from('contract_audit_logs')
          .select(`
            id, action, notes, created_at, user_name, contract_id
          `)
          .in('contract_id', contractIds.map(c => c.id))
          .eq('tenant_id', currentTenant?.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (contractActivities) {
          contractActivities.forEach(activity => {
            const contract = contractIds.find(c => c.id === activity.contract_id);
            allActivities.push({
              id: activity.id,
              type: 'contract',
              title: activity.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
              description: activity.notes || 'Contract activity',
              entityName: contract?.name,
              entityId: activity.contract_id,
              userName: activity.user_name,
              createdAt: activity.created_at,
              icon: <FileText className="h-4 w-4" />,
              color: 'bg-purple-100 text-purple-800',
            });
          });
        }
      }

      // Fetch todo activities for this site
      const { data: todoActivities } = await supabase
        .from('todo_audit_logs')
        .select(`
          id, action, notes, created_at, user_name, todo_id,
          todos(title, entity_type, entity_id)
        `)
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (todoActivities) {
        // Filter todos related to this site (either directly or through deals/contracts)
        const siteRelatedTodos = todoActivities.filter(activity => {
          if (!activity.todos) return false;
          const todo = activity.todos as any;
          
          // Direct site todos
          if (todo.entity_type === 'site' && todo.entity_id === siteId) return true;
          
          // Deal todos for site deals
          if (todo.entity_type === 'deal' && dealIds?.some(d => d.id === todo.entity_id)) return true;
          
          // Contract todos for site contracts
          if (todo.entity_type === 'contract' && contractIds?.some(c => c.id === todo.entity_id)) return true;
          
          return false;
        });

        siteRelatedTodos.forEach(activity => {
          const todo = activity.todos as any;
          allActivities.push({
            id: activity.id,
            type: 'todo',
            title: activity.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
            description: `${todo.title} - ${activity.notes || 'Todo activity'}`,
            userName: activity.user_name,
            createdAt: activity.created_at,
            icon: <Calendar className="h-4 w-4" />,
            color: 'bg-orange-100 text-orange-800',
          });
        });
      }

      // Sort all activities by date (newest first)
      allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setActivities(allActivities.slice(0, 50)); // Limit to 50 most recent activities
    } catch (error) {
      console.error('Error fetching site activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start space-x-4">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activities found for this site.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id} className="flex items-start space-x-4 pb-4 border-b border-border last:border-b-0">
                <div className={`p-2 rounded-full ${activity.color.replace('text-', 'bg-').replace('800', '200')}`}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={activity.color}>
                      {activity.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <h4 className="font-medium text-sm">
                    {activity.title}
                    {activity.entityName && (
                      <span className="text-muted-foreground"> • {activity.entityName}</span>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  {activity.userName && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      <span className="text-xs text-muted-foreground">{activity.userName}</span>
                    </div>
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