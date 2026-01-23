import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle, Circle, Clock, ExternalLink, Filter, Search, Trash2, User, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from '@/hooks/use-toast';
import { format, isToday, isPast, isTomorrow, isThisWeek, isThisMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  entity_type: string;
  entity_id: string;
  created_by: string;
  assigned_to?: string;
  completed_by?: string;
  contact_id?: string;
  payment_term_id?: string;
  type_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  assigned_profile?: { first_name: string; last_name: string };
  completed_by_profile?: { first_name: string; last_name: string };
  created_by_profile?: { first_name: string; last_name: string };
  contact?: { first_name: string; last_name: string };
  entity_name?: string;
  todo_types?: { name: string; color: string; icon: string };
  todo_assignees?: Array<{
    id: string;
    user_id: string;
    profiles: {
      id: string;
      first_name: string;
      last_name: string;
    };
  }>;
  // Hierarchy metadata
  source_entity_type?: string;
  source_entity_name?: string;
  installment_number?: number;
}

interface ExternalFilters {
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  timeframe?: 'all' | 'overdue' | 'due_today' | 'later';
  showCreatedByMe?: boolean;
  showCompleted?: boolean;
}

interface TodoListProps {
  entityType?: string;
  entityId?: string;
  assignedTo?: string;
  todos?: Todo[];
  loading?: boolean;
  error?: string | null;
  showFilters?: boolean;
  showStats?: boolean;
  compact?: boolean;
  title?: string;
  canEdit?: boolean;
  onUpdate?: () => void;
  onTodoClick?: (todo: Todo) => void;
  showAssigneeFilter?: boolean;
  externalFilters?: ExternalFilters;
}

export const TodoList: React.FC<TodoListProps> = ({
  entityType,
  entityId,
  assignedTo,
  todos: externalTodos,
  loading: externalLoading = false,
  error: externalError = null,
  showFilters = true,
  showStats = true,
  compact = false,
  title = "To-Do Items",
  canEdit = true,
  onUpdate,
  onTodoClick,
  showAssigneeFilter = true,
  externalFilters
}) => {
  const { currentTenant } = useTenant();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [internalShowCreatedByMe, setInternalShowCreatedByMe] = useState(false);
  const [internalTimeframe, setInternalTimeframe] = useState<'all' | 'overdue' | 'due_today' | 'later'>('all');
  const [internalShowCompleted, setInternalShowCompleted] = useState(false);
  const [internalSortBy, setInternalSortBy] = useState('due_date');
  const [internalSortOrder, setInternalSortOrder] = useState('asc');
  const [filterAssignee, setFilterAssignee] = useState(assignedTo || 'all');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Use external filters if provided, otherwise use internal state
  const searchTerm = externalFilters?.searchTerm ?? internalSearchTerm;
  const sortBy = externalFilters?.sortBy ?? internalSortBy;
  const sortOrder = externalFilters?.sortOrder ?? internalSortOrder;
  const timeframe = externalFilters?.timeframe ?? internalTimeframe;
  const showCreatedByMe = externalFilters?.showCreatedByMe ?? internalShowCreatedByMe;
  const showCompleted = externalFilters?.showCompleted ?? internalShowCompleted;

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_tenant_memberships')
        .select(`
          user_id,
          profiles!inner(id, first_name, last_name, email)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      if (error) throw error;
      setProfiles(data?.map(item => item.profiles) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user profiles",
        variant: "destructive"
      });
    }
  }, [currentTenant?.id]);

  const fetchTodos = useCallback(async () => {
    if (externalTodos) {
      setTodos(externalTodos);
      return;
    }

    if (!currentTenant?.id) return;

    try {
      setLoading(true);
      let query = supabase
        .from('todos')
        .select(`
          *,
          assigned_profile:profiles!todos_assigned_to_fkey(first_name, last_name),
          completed_by_profile:profiles!todos_completed_by_fkey(first_name, last_name),
          created_by_profile:profiles!todos_created_by_fkey(first_name, last_name),
          todo_types(name, color, icon),
          todo_assignees(
            id,
            user_id,
            profiles!todo_assignees_user_id_fkey(id, first_name, last_name)
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId);
      }

      if (assignedTo && assignedTo !== 'all') {
        query = query.eq('assigned_to', assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enhance todos with entity names
      const enhancedTodos = await Promise.all((data || []).map(async (todo) => {
        let entityName = '';
        try {
          const entityTableMap: Record<string, string> = {
            'deal': 'deals',
            'contract': 'contracts', 
            'company': 'companies',
            'contact': 'contacts',
            'site': 'sites',
            'project': 'projects'
          };
          
          const tableName = entityTableMap[todo.entity_type];
          if (tableName) {
            const { data: entityData } = await supabase
              .from(tableName as any)
              .select('name')
              .eq('id', todo.entity_id)
              .single();
            
            if (entityData && 'name' in entityData && entityData.name) {
              entityName = String(entityData.name);
            }
          }
        } catch (err) {
          // Ignore entity fetch errors
        }

        return {
          ...todo,
          entity_name: entityName
        } as Todo;
      }));

      setTodos(enhancedTodos);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load todos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, entityType, entityId, assignedTo, externalTodos]);

  const getEntityTable = (entityType: string): string => {
    const entityTables: Record<string, string> = {
      'deal': 'deals',
      'contract': 'contracts',
      'company': 'companies',
      'contact': 'contacts',
      'site': 'sites',
      'project': 'projects'
    };
    return entityTables[entityType] || entityType;
  };

  useEffect(() => {
    getCurrentUser();
    fetchProfiles();
    fetchTodos();
  }, [getCurrentUser, fetchProfiles, fetchTodos]);

  const filteredTodos = useMemo(() => {
    let filtered = todos;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (todo.description && todo.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Assignee filter
    if (filterAssignee !== 'all') {
      filtered = filtered.filter(todo => todo.assigned_to === filterAssignee);
    }

    // Apply filters
    filtered = filtered.filter(todo => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
      
      // ENTITY CONTEXT MODE: When viewing todos inside an entity widget (entityId + entityType provided),
      // show ALL tasks linked to that entity regardless of assignment or "created by me" filters.
      // This ensures users see every task on a Deal, Contract, etc.
      const isEntityContext = entityType && entityId;
      
      // Handle completed filter - if OFF, hide completed tasks; if ON, show all statuses
      if (!showCompleted && todo.status === 'completed') {
        return false;
      }

      // If showing completed and task is completed, include it
      if (showCompleted && todo.status === 'completed') {
        return true;
      }

      // In entity context, skip the "created by me" exclusion logic - show all entity tasks
      if (isEntityContext) {
        // Only apply timeframe filter in entity context
        if (timeframe === 'all') {
          return true;
        }

        if (timeframe === 'overdue') {
          return todo.due_date && new Date(todo.due_date) < startOfDay;
        }

        if (timeframe === 'due_today') {
          if (!todo.due_date) return false;
          const dueDate = new Date(todo.due_date);
          return dueDate >= startOfDay && dueDate <= endOfDay;
        }

        if (timeframe === 'later') {
          if (!todo.due_date) return true;
          const dueDate = new Date(todo.due_date);
          return dueDate > endOfDay;
        }

        return true;
      }

      // NON-ENTITY CONTEXT (Central To-Do Module): Apply "created by me" filtering
      const isCreatedByMeButNotAssigned = todo.created_by === currentUserId && 
        (!todo.todo_assignees || todo.todo_assignees.length === 0 || !todo.todo_assignees.some(a => a.user_id === currentUserId));

      // If "Created by me" is ON, show those separately  
      if (showCreatedByMe && isCreatedByMeButNotAssigned) {
        return true;
      }

      // Skip created-by-me tasks for timeframe filtering (they're handled above)
      if (isCreatedByMeButNotAssigned) {
        return false;
      }

      // Timeframe filter (single-select)
      if (timeframe === 'all') {
        return true; // Show all non-completed tasks
      }

      if (timeframe === 'overdue') {
        return todo.due_date && new Date(todo.due_date) < startOfDay;
      }

      if (timeframe === 'due_today') {
        if (!todo.due_date) return false;
        const dueDate = new Date(todo.due_date);
        return dueDate >= startOfDay && dueDate <= endOfDay;
      }

      if (timeframe === 'later') {
        if (!todo.due_date) return true; // No due date = Later
        const dueDate = new Date(todo.due_date);
        return dueDate > endOfDay;
      }

      return true;
    });

    // Sort todos
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Todo] || '';
      let bValue: any = b[sortBy as keyof Todo] || '';

      if (sortBy === 'due_date') {
        aValue = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
        bValue = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [todos, searchTerm, filterAssignee, timeframe, showCompleted, showCreatedByMe, currentUserId, sortBy, sortOrder]);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.status === 'completed').length;
    const pending = todos.filter(t => t.status === 'pending').length;
    const overdue = todos.filter(t => 
      t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed'
    ).length;

    return { total, completed, pending, overdue };
  }, [todos]);

  const toggleTodoComplete = async (todoId: string, currentStatus: string) => {
    if (!canEdit) return;

    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = currentUserId;
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      const { error } = await supabase
        .from('todos')
        .update(updateData)
        .eq('id', todoId);

      if (error) throw error;

      await fetchTodos();
      onUpdate?.();

      toast({
        title: "Success",
        description: `Todo ${newStatus === 'completed' ? 'completed' : 'reopened'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update todo",
        variant: "destructive"
      });
    }
  };

  const navigateToEntity = (entityType: string, entityId: string) => {
    const routes: Record<string, string> = {
      'deal': '/deals',
      'contract': '/contracts',
      'company': '/companies',
      'contact': '/contacts',
      'site': '/sites',
      'project': '/projects'
    };
    
    const basePath = routes[entityType];
    if (basePath) {
      navigate(`${basePath}/${entityId}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string, dueDate?: string) => {
    if (status === 'completed') return 'text-green-600';
    if (dueDate && isPast(new Date(dueDate))) return 'text-red-600';
    if (status === 'in_progress') return 'text-blue-600';
    return 'text-gray-600';
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE');
    if (isThisMonth(date)) return format(date, 'MMM d');
    return format(date, 'MMM d, yyyy');
  };

  if (externalLoading || loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">Loading todos...</div>
        </CardContent>
      </Card>
    );
  }

  if (externalError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-red-600">{externalError}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showStats && !compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {title}
              {showFilters && !externalFilters && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search todos..."
                      value={internalSearchTerm}
                      onChange={(e) => setInternalSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  
                  {showAssigneeFilter && (
                    <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All assignees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All assignees</SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn("p-6", compact && "p-4")}>
          {filteredTodos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No todos found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    "border rounded-lg p-4 transition-all hover:shadow-sm",
                    todo.status === 'completed' && "opacity-60"
                  )}
                  onClick={() => onTodoClick?.(todo)}
                  role={onTodoClick ? "button" : undefined}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={todo.status === 'completed'}
                      onCheckedChange={() => toggleTodoComplete(todo.id, todo.status)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={cn(
                          "font-medium",
                          todo.status === 'completed' && "line-through"
                        )}>
                          {todo.title}
                        </h4>
                        
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getPriorityColor(todo.priority), "text-white")}
                        >
                          {todo.priority}
                        </Badge>
                        
                        {todo.todo_types && (
                          <Badge variant="secondary" className="text-xs">
                            {todo.todo_types.name}
                          </Badge>
                        )}
                      </div>
                      
                      {todo.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {todo.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {todo.entity_name && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToEntity(todo.entity_type, todo.entity_id);
                            }}
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {todo.entity_name}
                          </button>
                        )}
                        
                        {todo.assigned_profile && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {todo.assigned_profile.first_name} {todo.assigned_profile.last_name}
                          </div>
                        )}
                        
                        {todo.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs font-medium">Due:</span>
                          {formatDueDate(todo.due_date)}
                        </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs font-medium">Created:</span>
                          {format(new Date(todo.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Export both components for backward compatibility
export const TodoListEnhanced = TodoList;