import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  Plus, 
  History, 
  Link2, 
  FileText, 
  CheckSquare, 
  Activity,
  DollarSign,
  Trash2
} from 'lucide-react';
import { EntityTimeline } from '@/components/entity-timeline/EntityTimeline';
import { RelationshipTimeline } from '@/components/entity-timeline/RelationshipTimeline';
import { EntityRelationships } from '@/components/entity-relationships/EntityRelationships';
import { TodoWidget } from '@/components/todos/TodoWidget';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';

export type EntityType = 'deal' | 'contract' | 'site' | 'contact' | 'company' | 'lead_company' | 'lead_contact';

export interface EntityMasterPageProps {
  /** The type of entity being displayed */
  entityType: EntityType;
  /** The unique identifier of the entity */
  entityId: string;
  /** The entity's display name */
  entityName: string;
  /** Back button navigation path */
  backPath: string;
  /** Back button label */
  backLabel: string;
  /** Optional subtitle for the header */
  subtitle?: string;
  /** Status badge configuration */
  statusBadge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  /** Whether the user can edit this entity */
  canEdit?: boolean;
  /** Called when edit button is clicked */
  onEdit?: () => void;
  /** Called when delete button is clicked */
  onDelete?: () => void;
  /** Called when add activity button is clicked */
  onAddActivity?: () => void;
  /** Called when add todo button is clicked */
  onAddTodo?: () => void;
  /** Whether to show installments tab (Deals/Contracts only) */
  showInstallments?: boolean;
  /** Whether to show files tab */
  showFiles?: boolean;
  /** Whether to show activities tab */
  showActivities?: boolean;
  /** Whether to show todos in sidebar */
  showTodosInSidebar?: boolean;
  /** Custom sidebar content */
  sidebarContent?: ReactNode;
  /** Custom main content (shows in "Overview" tab) */
  overviewContent?: ReactNode;
  /** Custom installments content */
  installmentsContent?: ReactNode;
  /** Custom files content */
  filesContent?: ReactNode;
  /** Custom activities content */
  activitiesContent?: ReactNode;
  /** Additional header actions */
  headerActions?: ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Current active tab (controlled) */
  activeTab?: string;
  /** Tab change handler (controlled) */
  onTabChange?: (tab: string) => void;
  /** Default active tab */
  defaultTab?: string;
  /** Quick stats to display in sidebar */
  quickStats?: Array<{ label: string; value: string | ReactNode }>;
  /** Whether the entity can have delete permission */
  showDeleteButton?: boolean;
  /** Whether delete action is in progress */
  isDeleting?: boolean;
}

export function EntityMasterPage({
  entityType,
  entityId,
  entityName,
  backPath,
  backLabel,
  subtitle,
  statusBadge,
  canEdit = false,
  onEdit,
  onDelete,
  onAddActivity,
  onAddTodo,
  showInstallments = false,
  showFiles = false,
  showActivities = true,
  showTodosInSidebar = true,
  sidebarContent,
  overviewContent,
  installmentsContent,
  filesContent,
  activitiesContent,
  headerActions,
  loading = false,
  activeTab,
  onTabChange,
  defaultTab = 'overview',
  quickStats,
  showDeleteButton = false,
  isDeleting = false,
}: EntityMasterPageProps) {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const { hasPermission } = usePermissions();
  
  const [internalTab, setInternalTab] = useState(defaultTab);
  const currentTab = activeTab ?? internalTab;
  
  const handleTabChange = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  // Map entity types for relationship queries
  const getRelationshipEntityType = (): 'deal' | 'site' | 'lead_company' | 'lead_contact' | 'contract' => {
    if (entityType === 'company' || entityType === 'contact') {
      return 'deal'; // Companies/Contacts use deals as their relationship anchor
    }
    return entityType as 'deal' | 'site' | 'lead_company' | 'lead_contact' | 'contract';
  };

  const getTimelineViewType = (): 'company' | 'contact' | 'deal' | 'site' | 'lead_company' | 'lead_contact' => {
    return entityType as 'company' | 'contact' | 'deal' | 'site' | 'lead_company' | 'lead_contact';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(backPath)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Button>
            <div>
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded mt-2" />
            </div>
          </div>
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(backPath)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{entityName}</h1>
                {statusBadge && (
                  <Badge variant={statusBadge.variant || 'default'}>
                    {statusBadge.label}
                  </Badge>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {onAddTodo && (
              <Button variant="outline" onClick={onAddTodo}>
                <Plus className="h-4 w-4 mr-2" />
                Add Todo
              </Button>
            )}
            {onAddActivity && (
              <Button variant="outline" onClick={onAddActivity}>
                <Plus className="h-4 w-4 mr-2" />
                Log Activity
              </Button>
            )}
            {canEdit && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {showDeleteButton && onDelete && (
              <Button 
                variant="destructive" 
                onClick={onDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
            {headerActions}
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Custom Sidebar Content */}
            {sidebarContent}

            {/* Todos Section */}
            {showTodosInSidebar && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CheckSquare className="h-4 w-4" />
                    To-Do Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TodoWidget 
                    entityType={entityType}
                    entityId={entityId}
                    canEdit={canEdit}
                    compact={true}
                    includeChildren={true}
                  />
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            {quickStats && quickStats.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickStats.map((stat, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{stat.label}</span>
                      <span className="font-medium">{stat.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                
                {showInstallments && (
                  <TabsTrigger value="installments" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Installments
                  </TabsTrigger>
                )}
                
                <TabsTrigger value="relationships" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Relationships
                </TabsTrigger>
                
                {showActivities && (
                  <TabsTrigger value="activities" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Activities
                  </TabsTrigger>
                )}
                
                {showFiles && (
                  <TabsTrigger value="files" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Files
                  </TabsTrigger>
                )}
                
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {overviewContent}
              </TabsContent>

              {/* Installments Tab */}
              {showInstallments && (
                <TabsContent value="installments" className="space-y-4">
                  {installmentsContent || (
                    <Card>
                      <CardHeader>
                        <CardTitle>Payment Installments</CardTitle>
                        <CardDescription>
                          Manage payment schedule and installments
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No installments configured yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}

              {/* Relationships Tab */}
              <TabsContent value="relationships" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Active Relationships Manager */}
                  <EntityRelationships 
                    entityType={getRelationshipEntityType()}
                    entityId={entityId}
                    title="Linked Companies & Contacts"
                  />
                  
                  {/* Relationship History Timeline */}
                  <RelationshipTimeline
                    searchId={entityId}
                    viewingEntityType={getTimelineViewType()}
                    title="Relationship History"
                    maxHeight="400px"
                  />
                </div>
              </TabsContent>

              {/* Activities Tab */}
              {showActivities && (
                <TabsContent value="activities" className="space-y-4">
                  {activitiesContent || (
                    <EntityTimeline 
                      entityType={entityType}
                      entityId={entityId}
                      title="Activity Feed"
                      maxHeight="600px"
                    />
                  )}
                </TabsContent>
              )}

              {/* Files Tab */}
              {showFiles && (
                <TabsContent value="files" className="space-y-4">
                  {filesContent || (
                    <Card>
                      <CardHeader>
                        <CardTitle>Files & Documents</CardTitle>
                        <CardDescription>
                          Attached files and documents
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No files attached yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}

              {/* History Tab - Unified Audit + Activity Timeline */}
              <TabsContent value="history" className="space-y-4">
                <HistoryTimeline 
                  entityType={entityType}
                  entityId={entityId}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============================================
// HistoryTimeline - Unified audit + activity view
// ============================================

interface HistoryTimelineProps {
  entityType: string;
  entityId: string;
}

function HistoryTimeline({ entityType, entityId }: HistoryTimelineProps) {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  interface HistoryEntry {
    id: string;
    type: 'activity' | 'audit';
    title: string;
    description?: string;
    timestamp: string;
    actor?: string;
    category: string;
    metadata?: Record<string, any>;
  }

  useEffect(() => {
    fetchHistory();
  }, [currentTenant, entityType, entityId]);

  const fetchHistory = async () => {
    if (!currentTenant?.id || !entityId) return;

    try {
      setLoading(true);
      
      // Import supabase here to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Fetch activity logs
      const { data: activityLogs, error: activityError } = await supabase
        .from('activity_logs')
        .select(`
          id,
          title,
          description,
          activity_type,
          created_at,
          created_by
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (activityError) throw activityError;

      // Get user names for activity logs
      const activityEntries: HistoryEntry[] = await Promise.all(
        (activityLogs || []).map(async (log) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', log.created_by)
            .single();

          return {
            id: log.id,
            type: 'activity' as const,
            title: log.title,
            description: log.description || undefined,
            timestamp: log.created_at,
            actor: profile ? `${profile.first_name} ${profile.last_name}`.trim() : undefined,
            category: log.activity_type,
          };
        })
      );

      // Sort by timestamp descending
      const allEntries = [...activityEntries].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setEntries(allEntries);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (entries.length === 0) {
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
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Complete History
        </CardTitle>
        <CardDescription>
          All changes and activities for this record ({entries.length} entries)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative max-h-[600px] overflow-y-auto pr-4">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {entries.map((entry) => (
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
