import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Flag, FlagOff } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

interface EntityCardField {
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  value: string | ReactNode;
  isSecondary?: boolean;
}

interface EntityCardAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  permission?: string;
}

interface EntityCardProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  };
  fields: EntityCardField[];
  actions?: EntityCardAction[];
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleLead?: () => void;
  isLead?: boolean;
  editPermission?: string;
  deletePermission?: string;
  leadPermission?: string;
}

export const EntityCard = ({
  id,
  title,
  icon: IconComponent,
  badge,
  fields,
  actions = [],
  onEdit,
  onDelete,
  onToggleLead,
  isLead = false,
  editPermission,
  deletePermission,
  leadPermission,
}: EntityCardProps) => {
  const { hasPermission } = usePermissions();

  const defaultActions: EntityCardAction[] = [
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
    <Card key={id} className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg truncate">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isLead && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <Flag className="h-3 w-3 mr-1" />
                Lead
              </Badge>
            )}
            {badge && (
              <Badge variant={badge.variant} className={badge.className}>
                {badge.text}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index} className={`flex items-center gap-2 ${field.isSecondary ? 'text-sm text-muted-foreground' : ''}`}>
              {field.icon && <field.icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
              {field.label && <span className="font-medium">{field.label}:</span>}
              <span className="truncate">{field.value}</span>
            </div>
          ))}
        </div>
        
        {defaultActions.length > 0 && (
          <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            {defaultActions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.variant || 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                title={action.label}
              >
                <action.icon className="h-3 w-3" />
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};