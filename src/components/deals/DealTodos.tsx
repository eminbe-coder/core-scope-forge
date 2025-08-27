import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare, Calendar, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { CreateTodoModal } from '@/components/modals/CreateTodoModal';
interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  assigned_to?: string;
  created_at: string;
  assigned_user?: {
    first_name: string;
    last_name: string;
  };
}
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
  const {
    currentTenant
  } = useTenant();
  const {
    toast
  } = useToast();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const fetchTodos = async () => {
    if (!currentTenant || !dealId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('activities').select(`
          id,
          title,
          description,
          due_date,
          completed,
          completed_at,
          assigned_to,
          created_at,
          assigned_user:profiles!activities_assigned_to_fkey(first_name, last_name)
        `).eq('deal_id', dealId).eq('type', 'task').order('due_date', {
        ascending: true,
        nullsFirst: false
      }).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTodos();
  }, [currentTenant, dealId]);
  useImperativeHandle(ref, () => ({
    refresh: fetchTodos
  }));
  const toggleTodoCompletion = async (todoId: string, completed: boolean) => {
    try {
      const {
        error
      } = await supabase.from('activities').update({
        completed: !completed,
        completed_at: !completed ? new Date().toISOString() : null
      }).eq('id', todoId);
      if (error) throw error;
      await fetchTodos();
      toast({
        title: 'Success',
        description: `Task ${!completed ? 'completed' : 'reopened'}`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const deleteTodo = async (todoId: string) => {
    try {
      const {
        error
      } = await supabase.from('activities').delete().eq('id', todoId);
      if (error) throw error;
      await fetchTodos();
      toast({
        title: 'Success',
        description: 'Task deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const getStatusBadge = (todo: Todo) => {
    if (todo.completed) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    }
    if (todo.due_date) {
      const dueDate = new Date(todo.due_date);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return <Badge variant="destructive">Overdue</Badge>;
      } else if (diffDays === 0) {
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Due Today</Badge>;
      } else if (diffDays <= 3) {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Due Soon</Badge>;
      }
    }
    return <Badge variant="secondary">Pending</Badge>;
  };
  if (loading) {
    return <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading tasks...</div>
        </CardContent>
      </Card>;
  }
  return <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-center font-light text-sm">
                <CheckSquare className="h-5 w-5" />
                To-Do Tasks
              </CardTitle>
              <CardDescription></CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todos.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              No tasks created yet. Click "Add Task" to get started.
            </div> : <div className="space-y-4">
              {todos.map(todo => <div key={todo.id} className={`border rounded-lg p-4 ${todo.completed ? 'bg-muted/50' : 'bg-background'}`}>
                  <div className="flex items-start gap-3">
                    <Checkbox checked={todo.completed} onCheckedChange={() => toggleTodoCompletion(todo.id, todo.completed)} className="mt-1" />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className={`font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {todo.title}
                          </h4>
                          {todo.description && <p className={`text-sm mt-1 ${todo.completed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                              {todo.description}
                            </p>}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusBadge(todo)}
                          <Button variant="ghost" size="sm" onClick={() => deleteTodo(todo.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {todo.due_date && <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {new Date(todo.due_date).toLocaleDateString()}
                          </div>}
                        
                        {todo.assigned_user && <div>
                            Assigned to: {todo.assigned_user.first_name} {todo.assigned_user.last_name}
                          </div>}
                        
                        {todo.completed && todo.completed_at && <div>
                            Completed: {new Date(todo.completed_at).toLocaleDateString()}
                          </div>}
                      </div>
                    </div>
                  </div>
                </div>)}
            </div>}
        </CardContent>
      </Card>

      <CreateTodoModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={() => {
      setShowCreateModal(false);
      fetchTodos();
      toast({
        title: 'Success',
        description: 'Task created successfully'
      });
    }} entityId={dealId} entityType="deal" entityName={dealName} />
    </>;
});