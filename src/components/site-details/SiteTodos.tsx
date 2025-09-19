import { forwardRef, useImperativeHandle } from 'react';
import { TodoWidget } from '@/components/todos/TodoWidget';

interface SiteTodosProps {
  siteId: string;
  siteName: string;
  onTodoClick?: (todo: any) => void;
}

export interface SiteTodosRef {
  refresh: () => void;
}

export const SiteTodos = forwardRef<SiteTodosRef, SiteTodosProps>(({
  siteId,
  siteName,
  onTodoClick
}, ref) => {
  useImperativeHandle(ref, () => ({
    refresh: () => {
      // This will be handled by the TodoWidget's refresh capability
    }
  }));

  return (
    <TodoWidget 
      entityType="site"
      entityId={siteId}
      canEdit={true}
      compact={false}
      includeChildren={true}
      onTodoClick={onTodoClick}
    />
  );
});