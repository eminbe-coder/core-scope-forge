import { useState } from 'react';
import { TodoList } from './TodoList';
import { TodoFormTrigger } from './TodoFormTrigger';
import { UnifiedTodoModal } from './UnifiedTodoModal';
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

  const [selectedTodo, setSelectedTodo] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUpdate = () => {
    refreshTodos();
    onUpdate?.();
  };

  const handleTodoClick = (todo: any) => {
    // If external handler provided, use it; otherwise open the standard modal
    if (onTodoClick) {
      onTodoClick(todo);
    } else {
      setSelectedTodo(todo);
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTodo(null);
  };

  return (
    <div className="w-full space-y-2">
      {canEdit && (
        <div className="flex justify-end">
          <TodoFormTrigger 
            onSuccess={handleUpdate}
            defaultEntityType={entityType}
            defaultEntityId={entityId}
            paymentTermId={paymentTermId}
            trigger={
              <Button size="sm" className="h-7 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            }
          />
        </div>
      )}
      <TodoList
        entityType={entityType}
        entityId={entityId}
        todos={todos as any}
        loading={loading}
        error={error}
        showFilters={!compact}
        showStats={!compact}
        compact={compact}
        canEdit={canEdit}
        onUpdate={handleUpdate}
        onTodoClick={handleTodoClick}
      />

      {/* Unified Todo Modal */}
      <UnifiedTodoModal
        todo={selectedTodo}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onUpdate={handleUpdate}
        canEdit={canEdit}
      />
    </div>
  );
};