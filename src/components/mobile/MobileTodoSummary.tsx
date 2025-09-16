import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  dueToday: number;
}

interface RecentTodo {
  id: string;
  title: string;
  due_date?: string;
  status: string;
  todo_types?: { name: string; color: string };
}

export function MobileTodoSummary() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<TodoStats>({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    dueToday: 0
  });
  const [recentTodos, setRecentTodos] = useState<RecentTodo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant?.id && user?.id) {
      fetchTodoData();
    }
  }, [currentTenant?.id, user?.id]);

  const fetchTodoData = async () => {
    try {
      const { data: todosData } = await supabase
        .from('todos')
        .select(`
          *,
          todo_types(name, color)
        `)
        .eq('tenant_id', currentTenant?.id)
        .eq('assigned_to', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (todosData) {
        const today = new Date().toISOString().split('T')[0];
        const completed = todosData.filter(t => t.status === 'completed').length;
        const pending = todosData.filter(t => t.status !== 'completed').length;
        const overdue = todosData.filter(t => 
          t.status !== 'completed' && 
          t.due_date && 
          t.due_date < today
        ).length;
        const dueToday = todosData.filter(t => 
          t.status !== 'completed' && 
          t.due_date === today
        ).length;

        setStats({
          total: todosData.length,
          completed,
          pending,
          overdue,
          dueToday
        });

        setRecentTodos(todosData.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching todo data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDueDateBadge = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed') return null;
    
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = dueDate < today;
    const isDueToday = dueDate === today;
    
    if (isOverdue) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    if (isDueToday) {
      return <Badge variant="secondary" className="text-xs">Due Today</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">My To-Dos</CardTitle>
          <Button
            size="sm"
            onClick={() => navigate('/my-todos')}
            variant="outline"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-lg font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Done</p>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="text-lg font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-lg font-bold text-red-600">{stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </div>

        {/* Recent Todos */}
        {recentTodos.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Recent Tasks</h3>
            {recentTodos.map((todo) => (
              <div 
                key={todo.id}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{todo.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {todo.todo_types && (
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: todo.todo_types.color }}
                      >
                        {todo.todo_types.name}
                      </Badge>
                    )}
                    {getDueDateBadge(todo.due_date, todo.status)}
                  </div>
                </div>
                {todo.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}