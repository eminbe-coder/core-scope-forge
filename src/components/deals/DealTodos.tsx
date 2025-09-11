import { forwardRef, useImperativeHandle } from 'react';
import { TodoWidget } from '@/components/todos/TodoWidget';
interface DealTodosProps {
  dealId: string;
  dealName: string;
}
export interface DealTodosRef {
  refresh: () => void;
}
export const DealTodos = forwardRef<DealTodosRef, DealTodosProps>(({
  dealId,
  dealName
}, ref) => {
  useImperativeHandle(ref, () => ({
    refresh: () => {
      // This will be handled by the TodoWidget's refresh capability
    }
  }));

  return (
    <TodoWidget 
      entityType="deal"
      entityId={dealId}
      canEdit={true}
      compact={false}
      includeChildren={true}
    />
  );
});