import { useState, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutGrid, List, Plus, Search } from 'lucide-react';
import { EntityCard } from './EntityCard';
import { EntityListRow } from './EntityListRow';

export type ViewMode = 'grid' | 'list';

interface EntityField {
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  value: string | ReactNode;
  isSecondary?: boolean;
}

interface EntityAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (entity: any) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  permission?: string;
}

interface EntityColumn {
  key: string;
  label: string;
  render: (value: any, row: any) => ReactNode;
  sortable?: boolean;
}

interface EntityListingProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  entities: any[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAdd?: () => void;
  addButtonText?: string;
  
  // Card view configuration
  getEntityCardProps: (entity: any) => {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: {
      text: string;
      variant?: 'default' | 'secondary' | 'destructive' | 'outline';
      className?: string;
    };
    fields: EntityField[];
  };
  
  // List view configuration
  columns: EntityColumn[];
  
  // Actions
  onEdit?: (entity: any) => void;
  onDelete?: (entity: any) => void;
  onToggleLead?: (entity: any) => void;
  customActions?: EntityAction[];
  
  // Permissions
  editPermission?: string;
  deletePermission?: string;
  leadPermission?: string;
  
  // Empty state
  emptyStateMessage?: string;
  emptyStateIcon?: React.ComponentType<{ className?: string }>;
}

export const EntityListing = ({
  title,
  description,
  icon: IconComponent,
  entities,
  loading,
  searchTerm,
  onSearchChange,
  onAdd,
  addButtonText = 'Add',
  getEntityCardProps,
  columns,
  onEdit,
  onDelete,
  onToggleLead,
  customActions = [],
  editPermission,
  deletePermission,
  leadPermission,
  emptyStateMessage,
  emptyStateIcon: EmptyIcon,
}: EntityListingProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading {title.toLowerCase()}...</p>
      </div>
    );
  }

  const EmptyStateIcon = EmptyIcon || IconComponent;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          {onAdd && (
            <Button onClick={onAdd}>
              <Plus className="mr-2 h-4 w-4" />
              {addButtonText}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {entities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <EmptyStateIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No {title.toLowerCase()} found</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {emptyStateMessage || `Get started by adding your first ${title.toLowerCase().slice(0, -1)}.`}
            </p>
            {onAdd && (
              <Button className="mt-4" onClick={onAdd}>
                <Plus className="mr-2 h-4 w-4" />
                {addButtonText}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity) => {
            const cardProps = getEntityCardProps(entity);
            return (
              <EntityCard
                key={cardProps.id}
                {...cardProps}
                onEdit={onEdit ? () => onEdit(entity) : undefined}
                onDelete={onDelete ? () => onDelete(entity) : undefined}
                onToggleLead={onToggleLead ? () => onToggleLead(entity) : undefined}
                isLead={entity.is_lead || false}
                actions={customActions.map(action => ({
                  ...action,
                  onClick: () => action.onClick(entity)
                }))}
                editPermission={editPermission}
                deletePermission={deletePermission}
                leadPermission={leadPermission}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconComponent className="h-5 w-5" />
              {title} ({entities.length})
            </CardTitle>
            <CardDescription>
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((entity) => (
                  <EntityListRow
                    key={entity.id}
                    row={entity}
                    columns={columns}
                    onEdit={onEdit ? () => onEdit(entity) : undefined}
                    onDelete={onDelete ? () => onDelete(entity) : undefined}
                    onToggleLead={onToggleLead ? () => onToggleLead(entity) : undefined}
                    isLead={entity.is_lead || false}
                    actions={customActions}
                    editPermission={editPermission}
                    deletePermission={deletePermission}
                    leadPermission={leadPermission}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};