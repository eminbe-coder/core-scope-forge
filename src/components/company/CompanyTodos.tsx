import { TodoWidget } from '@/components/todos/TodoWidget';

interface CompanyTodosProps {
  companyId: string;
}

export function CompanyTodos({ companyId }: CompanyTodosProps) {
  return (
    <TodoWidget 
      entityType="company"
      entityId={companyId}
      canEdit={true}
      compact={false}
      includeChildren={false}
    />
  );
}