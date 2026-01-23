import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Search, Activity, Phone, Mail, Calendar, CheckSquare, FileText, 
  Building2, Users, MapPin, Shield, RefreshCw, Filter, X,
  Briefcase, UserPlus, Settings, Clock
} from 'lucide-react';

interface ActivityLogItem {
  id: string;
  tenant_id: string;
  entity_id: string;
  entity_type: string; // 'deal', 'contact', 'company', 'site', 'system', 'contract', 'project'
  activity_type: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

interface TenantUser {
  user_id: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

// Module categorization
const getModuleFromEntityType = (entityType: string): string => {
  switch (entityType) {
    case 'deal':
    case 'contact':
    case 'company':
    case 'site':
    case 'customer':
      return 'CRM';
    case 'system':
      return 'System';
    case 'contract':
    case 'project':
      return 'Projects';
    default:
      return 'Other';
  }
};

// Activity type icons
const getActivityIcon = (activityType: string, entityType: string) => {
  // Entity-based icons
  if (entityType === 'deal') return Briefcase;
  if (entityType === 'contact') return Users;
  if (entityType === 'company') return Building2;
  if (entityType === 'site') return MapPin;
  if (entityType === 'system') return Shield;
  if (entityType === 'contract') return FileText;
  if (entityType === 'project') return Settings;
  
  // Activity-type based icons
  if (activityType.includes('todo')) return CheckSquare;
  if (activityType.includes('call')) return Phone;
  if (activityType.includes('email')) return Mail;
  if (activityType.includes('meeting')) return Calendar;
  if (activityType.includes('user') || activityType.includes('role')) return UserPlus;
  
  return Activity;
};

// Activity type colors (using semantic tokens where possible)
const getActivityColor = (activityType: string, entityType: string): string => {
  if (entityType === 'system') return 'bg-amber-500';
  if (entityType === 'deal') return 'bg-blue-500';
  if (entityType === 'contact') return 'bg-green-500';
  if (entityType === 'company') return 'bg-purple-500';
  if (entityType === 'site') return 'bg-cyan-500';
  if (entityType === 'contract') return 'bg-orange-500';
  if (entityType === 'project') return 'bg-indigo-500';
  
  if (activityType.includes('completed')) return 'bg-emerald-500';
  if (activityType.includes('created')) return 'bg-green-500';
  if (activityType.includes('updated') || activityType.includes('changed')) return 'bg-blue-500';
  
  return 'bg-gray-500';
};

// Module badge colors
const getModuleBadgeVariant = (module: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (module) {
    case 'CRM': return 'default';
    case 'System': return 'destructive';
    case 'Projects': return 'secondary';
    default: return 'outline';
  }
};

const MODULE_OPTIONS = [
  { value: 'all', label: 'All Modules' },
  { value: 'CRM', label: 'CRM' },
  { value: 'System', label: 'System' },
  { value: 'Projects', label: 'Projects' },
];

const Activities = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [moduleFilter, setModuleFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch tenant users for filter
  const fetchTenantUsers = async () => {
    if (!currentTenant) return;
    
    try {
      const { data, error } = await supabase
        .from('user_tenant_memberships')
        .select('user_id')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const userIds = data.map(m => m.user_id);
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        if (profileError) throw profileError;
        
        setTenantUsers(
          (profiles || []).map(p => ({
            user_id: p.id,
            profile: {
              first_name: p.first_name,
              last_name: p.last_name,
              email: p.email
            }
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching tenant users:', error);
    }
  };

  const fetchActivities = async () => {
    if (!currentTenant || !user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(500);
      
      // Apply date filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        // Add one day to include the entire end date
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('created_at', endDate.toISOString().split('T')[0]);
      }
      
      // Apply user filter
      if (userFilter !== 'all') {
        query = query.eq('created_by', userFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch creator profiles
      const creatorIds = [...new Set((data || []).map(log => log.created_by).filter(Boolean))];
      let profiles: Record<string, { first_name: string | null; last_name: string | null; email: string }> = {};
      
      if (creatorIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', creatorIds);
        
        if (profileData) {
          profiles = profileData.reduce((acc, p) => {
            acc[p.id] = { first_name: p.first_name, last_name: p.last_name, email: p.email };
            return acc;
          }, {} as Record<string, { first_name: string | null; last_name: string | null; email: string }>);
        }
      }
      
      // Merge profiles with activities
      const activitiesWithProfiles = (data || []).map(log => ({
        ...log,
        creator_profile: profiles[log.created_by] || null
      }));
      
      setActivities(activitiesWithProfiles);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantUsers();
  }, [currentTenant]);

  useEffect(() => {
    fetchActivities();
  }, [currentTenant, user, userFilter, dateFrom, dateTo]);

  // Apply client-side filters
  const filteredActivities = activities.filter(activity => {
    // Search filter
    const matchesSearch = 
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.activity_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Module filter
    const activityModule = getModuleFromEntityType(activity.entity_type);
    const matchesModule = moduleFilter === 'all' || activityModule === moduleFilter;
    
    return matchesSearch && matchesModule;
  });

  const clearFilters = () => {
    setModuleFilter('all');
    setUserFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  const hasActiveFilters = moduleFilter !== 'all' || userFilter !== 'all' || dateFrom || dateTo || searchTerm;

  const handleNavigateToEntity = (entityType: string, entityId: string) => {
    const routes: Record<string, string> = {
      deal: `/deals/edit/${entityId}`,
      contact: `/contacts/${entityId}`,
      company: `/companies/${entityId}`,
      site: `/sites/${entityId}`,
      contract: `/contracts/${entityId}`,
      project: `/projects/${entityId}`,
      customer: `/customers/${entityId}`,
    };
    
    const route = routes[entityType];
    if (route) {
      navigate(route);
    }
  };

  const getUserDisplayName = (profile: ActivityLogItem['creator_profile']) => {
    if (!profile) return 'System';
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile.email || 'Unknown';
  };

  if (loading && activities.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <p>Loading activity feed...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Activity Feed</h1>
            <p className="text-muted-foreground">
              Universal audit trail of all system activities
            </p>
          </div>
          <Button variant="outline" onClick={fetchActivities} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                !
              </Badge>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Module Filter */}
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Modules" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* User Filter */}
                <div className="space-y-2">
                  <Label>User</Label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {tenantUsers.map(tu => (
                        <SelectItem key={tu.user_id} value={tu.user_id}>
                          {tu.profile.first_name || tu.profile.last_name 
                            ? `${tu.profile.first_name || ''} ${tu.profile.last_name || ''}`.trim()
                            : tu.profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activity Table/List */}
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No activities found</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                {hasActiveFilters 
                  ? "No activities match your current filters. Try adjusting or clearing the filters."
                  : "Activity logs will appear here as users interact with the system."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Showing {filteredActivities.length} activities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-2">Time</div>
                <div className="col-span-2">User</div>
                <div className="col-span-5">Action</div>
                <div className="col-span-2">Module</div>
                <div className="col-span-1">Entity</div>
              </div>
              
              {/* Activity Rows */}
              <div className="divide-y">
                {filteredActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.activity_type, activity.entity_type);
                  const module = getModuleFromEntityType(activity.entity_type);
                  const isClickable = ['deal', 'contact', 'company', 'site', 'contract', 'project', 'customer'].includes(activity.entity_type);
                  
                  return (
                    <div 
                      key={activity.id} 
                      className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-muted/30 transition-colors ${isClickable ? 'cursor-pointer' : ''}`}
                      onClick={() => isClickable && handleNavigateToEntity(activity.entity_type, activity.entity_id)}
                    >
                      {/* Time */}
                      <div className="md:col-span-2 flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground md:hidden" />
                        <span className="text-muted-foreground">
                          {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      
                      {/* User */}
                      <div className="md:col-span-2 flex items-center gap-2 text-sm">
                        <span className="font-medium truncate">
                          {getUserDisplayName(activity.creator_profile)}
                        </span>
                      </div>
                      
                      {/* Action */}
                      <div className="md:col-span-5 flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${getActivityColor(activity.activity_type, activity.entity_type)} flex-shrink-0`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Module */}
                      <div className="md:col-span-2 flex items-center">
                        <Badge variant={getModuleBadgeVariant(module)} className="text-xs">
                          {module}
                        </Badge>
                      </div>
                      
                      {/* Entity Type */}
                      <div className="md:col-span-1 flex items-center">
                        <Badge variant="outline" className="text-xs capitalize">
                          {activity.entity_type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Activities;
