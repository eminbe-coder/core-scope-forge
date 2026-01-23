import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Search, 
  Filter, 
  RefreshCw, 
  User, 
  Clock, 
  FileText,
  CheckSquare,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ActivityLog {
  id: string;
  tenant_id: string;
  entity_id: string | null;
  entity_type: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  creator_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

const ENTITY_TYPES = [
  { value: 'all', label: 'All Entities' },
  { value: 'deal', label: 'Deals' },
  { value: 'contract', label: 'Contracts' },
  { value: 'contact', label: 'Contacts' },
  { value: 'company', label: 'Companies' },
  { value: 'site', label: 'Sites' },
  { value: 'project', label: 'Projects' },
  { value: 'customer', label: 'Customers' },
];

const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'todo_created', label: 'To-Do Created' },
  { value: 'todo_completed', label: 'To-Do Completed' },
  { value: 'todo_status_changed', label: 'Status Changed' },
  { value: 'todo_assigned', label: 'Assigned' },
  { value: 'todo_updated', label: 'Updated' },
  { value: 'note', label: 'Notes' },
  { value: 'call', label: 'Calls' },
  { value: 'email', label: 'Emails' },
  { value: 'meeting', label: 'Meetings' },
];

const getActivityIcon = (activityType: string) => {
  const iconMap: Record<string, typeof FileText> = {
    todo_created: CheckSquare,
    todo_completed: CheckSquare,
    todo_status_changed: CheckSquare,
    todo_assigned: User,
    todo_updated: CheckSquare,
    note: MessageSquare,
    call: Phone,
    email: Mail,
    meeting: Calendar,
  };
  return iconMap[activityType] || FileText;
};

const getActivityColor = (activityType: string) => {
  const colorMap: Record<string, string> = {
    todo_created: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    todo_completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    todo_status_changed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    todo_assigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    todo_updated: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    note: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    call: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    email: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    meeting: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  };
  return colorMap[activityType] || 'bg-muted text-muted-foreground';
};

const MasterActivityLog = () => {
  const { currentTenant, isAdmin } = useTenant();
  const navigate = useNavigate();
  
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    if (!currentTenant?.id) return;
    
    try {
      setRefreshing(true);
      
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (entityTypeFilter !== 'all') {
        query = query.eq('entity_type', entityTypeFilter);
      }

      if (activityTypeFilter !== 'all') {
        query = query.eq('activity_type', activityTypeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch creator profiles separately
      const creatorIds = [...new Set((data || []).map(log => log.created_by).filter(Boolean))];
      
      let profilesMap: Record<string, { first_name: string | null; last_name: string | null; email: string }> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', creatorIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as typeof profilesMap);
        }
      }
      
      // Merge profiles with logs
      const logsWithProfiles = (data || []).map(log => ({
        ...log,
        creator_profile: log.created_by ? profilesMap[log.created_by] || null : null
      }));
      
      setLogs(logsWithProfiles);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentTenant?.id) {
      fetchLogs();
    }
  }, [currentTenant?.id, entityTypeFilter, activityTypeFilter]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.title.toLowerCase().includes(searchLower) ||
      log.description?.toLowerCase().includes(searchLower) ||
      log.entity_type?.toLowerCase().includes(searchLower) ||
      log.activity_type.toLowerCase().includes(searchLower)
    );
  });

  const handleNavigateToEntity = (entityType: string | null, entityId: string | null) => {
    if (!entityType || !entityId) return;
    
    const routeMap: Record<string, string> = {
      deal: `/deals/edit/${entityId}`,
      contract: `/contracts/${entityId}`,
      contact: `/contacts/${entityId}`,
      company: `/companies/${entityId}`,
      site: `/sites/${entityId}`,
      project: `/projects/${entityId}`,
      customer: `/customers/${entityId}`,
    };
    
    const route = routeMap[entityType];
    if (route) {
      navigate(route);
    }
  };

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have permission to view the Master Activity Log. 
                This page is restricted to administrators only.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <History className="h-8 w-8" />
              Master Activity Log
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete audit trail of all activities across the tenant
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchLogs}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by entity" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activityTypeFilter} onValueChange={setActivityTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by activity type" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Activity History</span>
              <Badge variant="secondary">{filteredLogs.length} entries</Badge>
            </CardTitle>
            <CardDescription>
              Showing the most recent 500 activity log entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No activity logs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log) => {
                    const Icon = getActivityIcon(log.activity_type);
                    const colorClass = getActivityColor(log.activity_type);
                    
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handleNavigateToEntity(log.entity_type, log.entity_id)}
                      >
                        <div className={`p-2 rounded-full ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium truncate">{log.title}</h4>
                              {log.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {log.description}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {log.entity_type && (
                                <Badge variant="outline" className="capitalize">
                                  {log.entity_type}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {log.activity_type.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {log.creator_profile && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {log.creator_profile.first_name} {log.creator_profile.last_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MasterActivityLog;
