import { TodoList } from './TodoList';
import { QuickAddTodoForm } from './QuickAddTodoForm';
import { useTodoHierarchy } from '@/hooks/use-todo-hierarchy';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface TodoWidgetProps {
  entityType: string;
  entityId: string;
  paymentTermId?: string;
  canEdit?: boolean;
  compact?: boolean;
  onUpdate?: () => void;
  includeChildren?: boolean;
  onTodoClick?: (todo: any) => void;
}

export const TodoWidget = ({ 
  entityType, 
  entityId, 
  paymentTermId,
  canEdit = true,
  compact = false,
  onUpdate,
  includeChildren = true,
  onTodoClick
}: TodoWidgetProps) => {
  const { todos, loading, error, refreshTodos } = useTodoHierarchy({
    entityType,
    entityId,
    paymentTermId,
    includeChildren
  });

  const handleUpdate = () => {
    refreshTodos();
    onUpdate?.();
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <QuickAddTodoForm 
            onSuccess={handleUpdate}
            defaultEntityType={entityType}
            defaultEntityId={entityId}
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add To-Do
              </Button>
            }
          />
        </div>
      )}
      <TodoList
        todos={todos}
        loading={loading}
        error={error}
        showFilters={!compact}
        showStats={!compact}
        compact={compact}
        canEdit={canEdit}
        onUpdate={handleUpdate}
        onTodoClick={onTodoClick}
      />
    </div>
  );
};