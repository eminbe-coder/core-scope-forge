import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckSquare, 
  Plus,
  CheckCircle,
  Circle,
  Clock,
  User,
  Calendar as CalendarIcon,
  Phone,
  Mail
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  type: 'task' | 'call' | 'meeting' | 'email';
  assigned_to?: string;
  assigned_user?: {
    first_name: string;
    last_name: string;
  };
  created_by: string;
  created_user?: {
    first_name: string;
    last_name: string;
  };
  company_id?: string;
  created_at: string;
}

interface CompanyTodosProps {
  companyId: string;
}

const typeIcons = {
  task: CheckSquare,
  call: Phone,
  meeting: CalendarIcon,
  email: Mail,
};

export function CompanyTodos({ companyId }: CompanyTodosProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    type: 'task' as Todo['type'],
    due_date: '',
    assigned_to: '',
  });
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTodos();
  }, [companyId, currentTenant]);

  const fetchTodos = async () => {
    if (!currentTenant || !companyId) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          title,
          description,
          type,
          due_date,
          completed,
          completed_at,
          assigned_to,
          created_by,
          created_at,
          company_id,
          assigned_user:profiles!activities_assigned_to_fkey(first_name, last_name),
          created_user:profiles!activities_created_by_fkey(first_name, last_name)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('company_id', companyId)
        .in('type', ['task', 'call', 'meeting', 'email'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos((data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        due_date: item.due_date,
        completed: item.completed,
        completed_at: item.completed_at,
        type: item.type as Todo['type'],
        assigned_to: item.assigned_to,
        assigned_user: item.assigned_user,
        created_by: item.created_by,
        created_user: item.created_user,
        company_id: item.company_id,
        created_at: item.created_at,
      })));
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async () => {
    if (!currentTenant || !user || !newTodo.title.trim()) return;

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          title: newTodo.title,
          description: newTodo.description,
          type: newTodo.type,
          due_date: newTodo.due_date || null,
          assigned_to: newTodo.assigned_to || null,
          company_id: companyId,
          tenant_id: currentTenant.id,
          created_by: user.id,
          completed: false,
        });

      if (error) throw error;

      await fetchTodos();
      setCreateDialogOpen(false);
      setNewTodo({
        title: '',
        description: '',
        type: 'task',
        due_date: '',
        assigned_to: '',
      });

      toast({
        title: 'Success',
        description: 'Todo created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          completed: !todo.completed,
          completed_at: !todo.completed ? new Date().toISOString() : null,
        })
        .eq('id', todo.id);

      if (error) throw error;

      await fetchTodos();
      toast({
        title: 'Success',
        description: `Todo ${!todo.completed ? 'completed' : 'reopened'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getTypeIcon = (type: Todo['type']) => {
    const IconComponent = typeIcons[type];
    return <IconComponent className="h-4 w-4" />;
  };

  const getPriorityBadge = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    if (isPast(due) && !isToday(due)) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    } else if (isToday(due)) {
      return <Badge variant="default" className="text-xs">Due Today</Badge>;
    } else if (isTomorrow(due)) {
      return <Badge variant="secondary" className="text-xs">Due Tomorrow</Badge>;
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading todos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Company To-Do</CardTitle>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Todo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Todo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newTodo.title}
                    onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                    placeholder="Enter todo title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTodo.description}
                    onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                    placeholder="Enter description (optional)"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newTodo.type}
                    onValueChange={(value) => setNewTodo({ ...newTodo, type: value as Todo['type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={newTodo.due_date}
                    onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTodo} disabled={isCreating || !newTodo.title.trim()}>
                    {isCreating ? 'Creating...' : 'Create Todo'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {todos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No todos for this company yet. Create your first one!
          </div>
        ) : (
          <div className="space-y-3">
            {todos.map((todo) => (
              <div key={todo.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6"
                  onClick={() => handleToggleComplete(todo)}
                >
                  {todo.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(todo.type)}
                      <h4 className={`font-medium text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {todo.title}
                      </h4>
                      {getPriorityBadge(todo.due_date)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {todo.due_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(todo.due_date)}
                        </div>
                      )}
                    </div>
                  </div>
                  {todo.description && (
                    <p className={`text-sm mt-1 ${todo.completed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                      {todo.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {todo.assigned_user && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {todo.assigned_user.first_name} {todo.assigned_user.last_name}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {todo.type}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}