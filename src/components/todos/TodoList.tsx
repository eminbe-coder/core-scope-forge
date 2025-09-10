import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Clock, AlertTriangle, User, Calendar, Trash2, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  completed_by?: string;
  payment_term_id?: string;
  created_at: string;
  completed_at?: string;
  type_id?: string;
  entity_type: string;
  entity_id: string;
  assigned_profile?: { first_name: string; last_name: string } | null;
  completed_by_profile?: { first_name: string; last_name: string } | null;
  created_by_profile?: { first_name: string; last_name: string } | null;
  todo_types?: { name: string; color: string; icon: string } | null;
  // Hierarchy metadata
  source_entity_type?: string;
  source_entity_name?: string;
  installment_number?: number;
}

interface TodoListProps {
  todos?: Todo[];
  loading?: boolean;
  error?: string | null;
  entityType?: string;
  entityId?: string;
  showFilters?: boolean;
  showStats?: boolean;
  compact?: boolean;
  title?: string;
  canEdit?: boolean;
  onUpdate?: () => void;
}

export const TodoList = ({ 
  todos: propTodos,
  loading: propLoading,
  error: propError,
  entityType, 
  entityId, 
  showFilters = true, 
  showStats = true,
  compact = false,
  title = "To-Do Items",
  canEdit = true,
  onUpdate 
}: TodoListProps) => {
  const { currentTenant } = useTenant();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'in_progress'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [todoTypes, setTodoTypes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (propTodos) {
      // Use provided todos
      setTodos(propTodos);
      setLoading(false);
    } else if (currentTenant?.id && entityType && entityId) {
      // Fallback to fetching todos (backward compatibility)
      fetchTodos();
    } else {
      setTodos([]);
      setLoading(false);
    }
    
    if (currentTenant?.id) {
      fetchFiltersData();
    }
  }, [propTodos, currentTenant?.id, entityType, entityId]);

  // Use provided loading state or local loading state
  const isLoading = propLoading !== undefined ? propLoading : loading;

  const fetchFiltersData = async () => {
    try {
      const [todoTypesRes, profilesRes] = await Promise.all([
        supabase
          .from('todo_types')
          .select('*')
          .eq('tenant_id', currentTenant?.id)
          .eq('active', true)
          .order('sort_order'),
        
        supabase.from('user_tenant_memberships').select(`
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `).eq('tenant_id', currentTenant?.id).eq('active', true)
      ]);

      setTodoTypes(todoTypesRes.data || []);
      setProfiles((profilesRes.data || []).map((membership: any) => membership.profiles).filter(Boolean));
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchTodos = async () => {
    if (!currentTenant?.id) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('todos')
        .select(`
          *,
          assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
          completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
          created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
          todo_types (name, color, icon)
        `)
        .eq('tenant_id', currentTenant.id);
      
      // Filter by entity if provided
      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setTodos(data as any[] || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast.error('Failed to load to-do items');
    } finally {
      setLoading(false);
    }
  };

  const toggleTodoCompletion = async (todoId: string, currentStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user?.id;
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      const { error } = await supabase
        .from('todos')
        .update(updateData)
        .eq('id', todoId);

      if (error) throw error;

      toast.success(`To-do item ${newStatus === 'completed' ? 'completed' : 'uncompleted'}`);
      if (propTodos) {
        // If using provided todos, call onUpdate to refresh the parent
        onUpdate?.();
      } else {
        // Otherwise fetch todos locally
        fetchTodos();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update to-do item');
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;

      toast.success('To-do item deleted successfully');
      if (propTodos) {
        // If using provided todos, call onUpdate to refresh the parent
        onUpdate?.();
      } else {
        // Otherwise fetch todos locally
        fetchTodos();
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete to-do item');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Clock className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Apply filters
  const filteredTodos = todos.filter(todo => {
    // Status filter
    if (filter === 'completed' && todo.status !== 'completed') return false;
    if (filter === 'pending' && todo.status === 'completed') return false;
    if (filter === 'in_progress' && todo.status !== 'in_progress') return false;
    
    // Priority filter
    if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;
    
    // Type filter
    if (typeFilter !== 'all' && todo.type_id !== typeFilter) return false;
    
    // Assigned filter
    if (assignedFilter !== 'all') {
      if (assignedFilter === 'unassigned' && todo.assigned_to !== null) return false;
      if (assignedFilter !== 'unassigned' && todo.assigned_to !== assignedFilter) return false;
    }
    
    // Search filter
    if (searchQuery && !todo.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !todo.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    return true;
  });

  const todosStats = {
    total: todos.length,
    completed: todos.filter(t => t.status === 'completed').length,
    pending: todos.filter(t => t.status !== 'completed').length,
    inProgress: todos.filter(t => t.status === 'in_progress').length,
  };

  // Show error if provided
  if (propError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            {propError}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {showStats && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Total: {todosStats.total}</span>
              <span>Completed: {todosStats.completed}</span>
              <span>Pending: {todosStats.pending}</span>
              {todosStats.inProgress > 0 && <span>In Progress: {todosStats.inProgress}</span>}
            </div>
          )}
        </div>
        
        {showFilters && (
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search to-dos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({todosStats.total})
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pending ({todosStats.pending})
              </Button>
              {todosStats.inProgress > 0 && (
                <Button
                  variant={filter === 'in_progress' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('in_progress')}
                >
                  In Progress ({todosStats.inProgress})
                </Button>
              )}
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                Completed ({todosStats.completed})
              </Button>
            </div>

            {/* Advanced filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {todoTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPriorityFilter('all');
                  setTypeFilter('all');
                  setAssignedFilter('all');
                  setSearchQuery('');
                }}
                className="h-8"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {todos.length === 0 
              ? 'No to-do items yet. Create one to get started.' 
              : 'No to-do items match your filters.'
            }
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-lg transition-colors",
                  todo.status === 'completed' ? "bg-muted/50 border-muted" : "bg-background border-border hover:border-primary/20"
                )}
              >
                <Checkbox
                  checked={todo.status === 'completed'}
                  onCheckedChange={() => toggleTodoCompletion(todo.id, todo.status)}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={cn(
                      "font-medium",
                      todo.status === 'completed' && "line-through text-muted-foreground"
                    )}>
                      {todo.title}
                    </h4>
                    
                    {/* Status badge */}
                    <Badge variant={
                      todo.status === 'completed' ? 'default' : 
                      todo.status === 'in_progress' ? 'secondary' : 'outline'
                    } className="text-xs">
                      {todo.status === 'in_progress' ? 'In Progress' : 
                       todo.status === 'completed' ? 'Completed' : 'Pending'}
                    </Badge>
                    
                    {/* Priority badge */}
                    {(todo.priority === 'high' || todo.priority === 'urgent') && (
                      <Badge variant={todo.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                        {todo.priority === 'urgent' ? 'Urgent' : 'High Priority'}
                      </Badge>
                    )}
                    
                    {/* Type badge */}
                    {todo.todo_types && (
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ color: todo.todo_types.color, borderColor: todo.todo_types.color }}
                      >
                        {todo.todo_types.name}
                      </Badge>
                    )}
                    
                    {/* Source entity badge */}
                    {todo.source_entity_name && (
                      <Badge variant="outline" className="text-xs">
                        {todo.source_entity_name}
                      </Badge>
                    )}
                    
                    {/* Entity badge */}
                    {!todo.source_entity_name && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {todo.entity_type}
                      </Badge>
                    )}
                    
                    {/* Payment term badge */}
                    {todo.payment_term_id && !todo.source_entity_name && (
                      <Badge variant="outline" className="text-xs">
                        Payment term linked
                      </Badge>
                    )}
                  </div>
                  
                  {todo.description && (
                    <p className={cn(
                      "text-sm mt-1",
                      todo.status === 'completed' ? "text-muted-foreground" : "text-muted-foreground"
                    )}>
                      {todo.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {todo.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {formatDate(todo.due_date)}
                      </div>
                    )}
                    {todo.assigned_profile && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {todo.assigned_profile.first_name} {todo.assigned_profile.last_name}
                      </div>
                    )}
                    {todo.status === 'completed' && todo.completed_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed: {formatDate(todo.completed_at)}
                      </div>
                    )}
                    {getPriorityIcon(todo.priority || 'medium')}
                  </div>
                </div>
                
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTodo(todo.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};