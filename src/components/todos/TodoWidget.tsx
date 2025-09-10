import { TodoList } from './TodoList';
import { TodoForm } from './TodoForm';
import { useTodoHierarchy } from '@/hooks/use-todo-hierarchy';

interface TodoWidgetProps {
  entityType: string;
  entityId: string;
  paymentTermId?: string;
  canEdit?: boolean;
  compact?: boolean;
  onUpdate?: () => void;
  includeChildren?: boolean;
}

export const TodoWidget = ({ 
  entityType, 
  entityId, 
  paymentTermId,
  canEdit = true,
  compact = false,
  onUpdate,
  includeChildren = true
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
          <TodoForm 
            entityType={entityType}
            entityId={entityId}
            paymentTermId={paymentTermId}
            onSuccess={handleUpdate}
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
      />
    </div>
  );
};