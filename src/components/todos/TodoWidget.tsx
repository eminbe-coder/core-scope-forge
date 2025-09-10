import { TodoList } from './TodoList';
import { TodoForm } from './TodoForm';

interface TodoWidgetProps {
  entityType: string;
  entityId: string;
  paymentTermId?: string;
  canEdit?: boolean;
  compact?: boolean;
}

export const TodoWidget = ({ 
  entityType, 
  entityId, 
  paymentTermId,
  canEdit = true,
  compact = false 
}: TodoWidgetProps) => {
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <TodoForm 
            entityType={entityType}
            entityId={entityId}
            paymentTermId={paymentTermId}
            onSuccess={() => {
              // Refresh will happen via TodoList's useEffect
            }}
          />
        </div>
      )}
      <TodoList
        entityType={entityType}
        entityId={entityId}
        showFilters={!compact}
        showStats={!compact}
        compact={compact}
        canEdit={canEdit}
      />
    </div>
  );
};