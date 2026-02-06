import { useState, ReactNode } from 'react';
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
  CheckSquare, 
  Trash2
} from 'lucide-react';
import { EntityTimeline } from '@/components/entity-timeline/EntityTimeline';
import { RelationshipTimeline } from '@/components/entity-timeline/RelationshipTimeline';
import { EntityRelationships } from '@/components/entity-relationships/EntityRelationships';
import { TodoWidget } from '@/components/todos/TodoWidget';
import { HistoryTimeline } from './HistoryTimeline';
import { usePageLayout, ICON_MAP, type EntityType } from '@/hooks/use-page-layout';

export type { EntityType };

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
  const { visibleTabs, loading: configLoading } = usePageLayout({ entityType });
  
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

  // Render tab content based on component name
  const renderTabContent = (componentName: string) => {
    switch (componentName) {
      case 'OverviewContent':
        return overviewContent;
      case 'InstallmentsContent':
        return installmentsContent || (
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
        );
      case 'RelationshipsContent':
        return (
          <div className="grid grid-cols-1 gap-4">
            <EntityRelationships 
              entityType={getRelationshipEntityType()}
              entityId={entityId}
              title="Linked Companies & Contacts"
            />
            <RelationshipTimeline
              searchId={entityId}
              viewingEntityType={getTimelineViewType()}
              title="Relationship History"
              maxHeight="400px"
            />
          </div>
        );
      case 'ActivitiesContent':
        return activitiesContent || (
          <EntityTimeline 
            entityType={entityType}
            entityId={entityId}
            title="Activity Feed"
            maxHeight="600px"
          />
        );
      case 'FilesContent':
        return filesContent || (
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
        );
      case 'HistoryContent':
        return (
          <HistoryTimeline 
            entityType={entityType}
            entityId={entityId}
          />
        );
      default:
        return (
          <Card>
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center">
                Content for "{componentName}" not available
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  if (loading || configLoading) {
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

          {/* Main Content Area - Dynamic Tabs */}
          <div className="lg:col-span-3">
            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
              <TabsList className="flex-wrap">
                {visibleTabs.map(tab => {
                  const IconComponent = ICON_MAP[tab.icon];
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {visibleTabs.map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="space-y-4">
                  {renderTabContent(tab.component)}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
