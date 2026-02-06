import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Activity, Edit, Eye, EyeOff, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HistoryEntry {
  id: string;
  type: 'activity' | 'audit';
  title: string;
  description?: string;
  timestamp: string;
  actor?: string;
  category: string;
  visibilityLevel?: 'business' | 'admin';
  metadata?: Record<string, any>;
}

interface HistoryTimelineProps {
  entityType: string;
  entityId: string;
}

export function HistoryTimeline({ entityType, entityId }: HistoryTimelineProps) {
  const { currentTenant } = useTenant();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [showAdminLogs, setShowAdminLogs] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const canViewAdminLogs = hasPermission('view_admin_logs');

  useEffect(() => {
    fetchHistory();
  }, [currentTenant, entityType, entityId]);

  const fetchHistory = async () => {
    if (!currentTenant?.id || !entityId) return;

    try {
      setLoading(true);
      
      // Fetch activity logs
      const { data: activityLogs, error: activityError } = await supabase
        .from('activity_logs')
        .select(`
          id,
          title,
          description,
          activity_type,
          created_at,
          created_by,
          visibility_level
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;

      // Fetch universal audit logs (using correct column names)
      const { data: auditLogs, error: auditError } = await supabase
        .from('universal_audit_logs')
        .select(`
          id,
          field_name,
          old_value,
          new_value,
          created_at,
          changed_by,
          visibility_level
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (auditError) {
        console.error('Error fetching audit logs:', auditError);
        // Continue without audit logs if there's an error
      }

      // Get unique user IDs for profile lookup
      const userIds = new Set<string>();
      activityLogs?.forEach(log => userIds.add(log.created_by));
      auditLogs?.forEach(log => log.changed_by && userIds.add(log.changed_by));

      // Fetch profiles
      const profileMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', Array.from(userIds));

        profiles?.forEach(p => {
          profileMap[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
        });
      }

      // Transform activity logs
      const activityEntries: HistoryEntry[] = (activityLogs || []).map(log => ({
        id: log.id,
        type: 'activity' as const,
        title: log.title,
        description: log.description || undefined,
        timestamp: log.created_at,
        actor: profileMap[log.created_by] || 'System',
        category: log.activity_type,
        visibilityLevel: (log.visibility_level as 'business' | 'admin') || 'business',
      }));

      // Transform audit logs
      const auditEntries: HistoryEntry[] = (auditLogs || []).map(log => ({
        id: log.id,
        type: 'audit' as const,
        title: `Field Changed: ${log.field_name || 'Record'}`,
        description: log.old_value && log.new_value 
          ? `Changed from "${formatValue(log.old_value)}" to "${formatValue(log.new_value)}"`
          : log.new_value 
            ? `Set to "${formatValue(log.new_value)}"`
            : undefined,
        timestamp: log.created_at,
        actor: log.changed_by ? profileMap[log.changed_by] || 'System' : 'System',
        category: 'field_changed',
        visibilityLevel: (log.visibility_level as 'business' | 'admin') || 'business',
        metadata: { oldValue: log.old_value, newValue: log.new_value, fieldName: log.field_name },
      }));

      // Merge and sort
      const allEntries = [...activityEntries, ...auditEntries].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEntries(allEntries);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'empty';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Filter entries based on visibility and selected categories
  const filteredEntries = entries.filter(entry => {
    // Filter by visibility level
    if (entry.visibilityLevel === 'admin' && !canViewAdminLogs) return false;
    if (entry.visibilityLevel === 'admin' && !showAdminLogs) return false;
    
    // Filter by category
    if (selectedCategories.length > 0 && !selectedCategories.includes(entry.category)) return false;
    
    return true;
  });

  // Get unique categories for filter
  const allCategories = [...new Set(entries.map(e => e.category))];

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      todo_created: 'bg-blue-500',
      todo_completed: 'bg-green-500',
      todo_status_changed: 'bg-amber-500',
      todo_assigned: 'bg-purple-500',
      todo_updated: 'bg-slate-500',
      note: 'bg-gray-500',
      call: 'bg-green-600',
      email: 'bg-blue-600',
      meeting: 'bg-purple-600',
      file_upload: 'bg-indigo-500',
      status_changed: 'bg-orange-500',
      field_changed: 'bg-cyan-500',
      deal_created: 'bg-emerald-500',
      contract_created: 'bg-teal-500',
      company_created: 'bg-violet-500',
      contact_created: 'bg-pink-500',
      site_created: 'bg-rose-500',
      user_added: 'bg-red-500',
      user_removed: 'bg-red-600',
      role_changed: 'bg-amber-600',
    };
    return colors[category] || 'bg-muted-foreground';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      todo_created: 'To-Do Created',
      todo_completed: 'To-Do Completed',
      todo_status_changed: 'Status Changed',
      todo_assigned: 'Assignment Changed',
      todo_updated: 'To-Do Updated',
      note: 'Note',
      call: 'Call',
      email: 'Email',
      meeting: 'Meeting',
      file_upload: 'File Upload',
      status_changed: 'Status Changed',
      field_changed: 'Field Changed',
      deal_created: 'Deal Created',
      contract_created: 'Contract Created',
      company_created: 'Company Created',
      contact_created: 'Contact Created',
      site_created: 'Site Created',
      user_added: 'User Added',
      user_removed: 'User Removed',
      role_changed: 'Role Changed',
    };
    return labels[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Complete History
          </CardTitle>
          <CardDescription>
            All changes and activities for this record
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  if (filteredEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Complete History
          </CardTitle>
          <CardDescription>
            All changes and activities for this record
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No history recorded yet</p>
            <p className="text-xs text-muted-foreground mt-2">
              Changes and activities will appear here as they occur
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Complete History
            </CardTitle>
            <CardDescription>
              All changes and activities for this record ({filteredEntries.length} entries)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canViewAdminLogs && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdminLogs(!showAdminLogs)}
                className="gap-2"
              >
                {showAdminLogs ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                Admin Logs
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {allCategories.map(category => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={selectedCategories.length === 0 || selectedCategories.includes(category)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        if (selectedCategories.length === allCategories.length - 1) {
                          setSelectedCategories([]);
                        } else {
                          setSelectedCategories([...selectedCategories, category]);
                        }
                      } else {
                        const newCategories = selectedCategories.filter(c => c !== category);
                        if (newCategories.length === 0) {
                          setSelectedCategories(allCategories.filter(c => c !== category));
                        } else {
                          setSelectedCategories(newCategories);
                        }
                      }
                    }}
                  >
                    {getCategoryLabel(category)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative max-h-[600px] overflow-y-auto pr-4">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="relative flex gap-4 pl-1">
                {/* Timeline dot */}
                <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${getCategoryColor(entry.category)}`}>
                  {entry.type === 'audit' ? (
                    <Edit className="h-4 w-4" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{entry.title}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {getCategoryLabel(entry.category)}
                        </Badge>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {entry.type === 'audit' ? 'Audit' : 'Activity'}
                        </Badge>
                        {entry.visibilityLevel === 'admin' && (
                          <Badge variant="destructive" className="text-xs shrink-0">
                            Admin
                          </Badge>
                        )}
                      </div>
                      
                      {entry.description && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>
                      {new Date(entry.timestamp).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    
                    {entry.actor && (
                      <span>by {entry.actor}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
