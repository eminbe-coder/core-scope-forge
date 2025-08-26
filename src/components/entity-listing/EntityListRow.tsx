import { ReactNode } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Flag, FlagOff } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

interface EntityListColumn {
  key: string;
  label: string;
  render: (value: any, row: any) => ReactNode;
  sortable?: boolean;
}

interface EntityListAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: (row: any) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  permission?: string;
}

interface EntityListRowProps {
  row: any;
  columns: EntityListColumn[];
  actions?: EntityListAction[];
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onToggleLead?: (row: any) => void;
  isLead?: boolean;
  editPermission?: string;
  deletePermission?: string;
  leadPermission?: string;
}

export const EntityListRow = ({
  row,
  columns,
  actions = [],
  onEdit,
  onDelete,
  onToggleLead,
  isLead = false,
  editPermission,
  deletePermission,
  leadPermission,
}: EntityListRowProps) => {
  const { hasPermission } = usePermissions();

  const defaultActions: EntityListAction[] = [
    ...(onEdit && (!editPermission || hasPermission(editPermission)) ? [{
      icon: Edit,
      label: 'Edit',
      onClick: onEdit,
      variant: 'outline' as const,
    }] : []),
    ...(onToggleLead && (!leadPermission || hasPermission(leadPermission)) ? [{
      icon: isLead ? FlagOff : Flag,
      label: isLead ? 'Remove Lead' : 'Mark as Lead',
      onClick: onToggleLead,
      variant: 'outline' as const,
    }] : []),
    ...(onDelete && (!deletePermission || hasPermission(deletePermission)) ? [{
      icon: Trash2,
      label: 'Delete',
      onClick: onDelete,
      variant: 'destructive' as const,
    }] : []),
    ...actions,
  ];

  return (
    <TableRow className="group hover:bg-muted/50">
      {columns.map((column) => (
        <TableCell key={column.key}>
          {column.render(row[column.key], row)}
        </TableCell>
      ))}
      <TableCell>
        <div className="flex items-center gap-2">
          {isLead && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Flag className="h-3 w-3 mr-1" />
              Lead
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {defaultActions.map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant={action.variant || 'outline'}
              onClick={() => action.onClick(row)}
              title={action.label}
            >
              <action.icon className="h-3 w-3" />
            </Button>
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
};