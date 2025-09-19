import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { format, isToday, isPast, isTomorrow, isThisWeek, isThisMonth, isThisYear, isFuture } from 'date-fns';
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
  contact_id?: string;
  created_at: string;
  updated_at: string;
  assigned_profile?: { first_name: string; last_name: string };
  contact?: { first_name: string; last_name: string };
  entity_name?: string;
  todo_assignees?: Array<{
    id: string;
    user_id: string;
    profiles: {
      id: string;
      first_name: string;
      last_name: string;
    };
  }>;
}

interface TodoListEnhancedProps {
  entityType?: string;
  entityId?: string;
  assignedTo?: string;
  showFilters?: boolean;
  onTodoClick?: (todo: Todo) => void;
  showAssigneeFilter?: boolean;
}

export const TodoListEnhanced: React.FC<TodoListEnhancedProps> = ({
  entityType,
  entityId,
  assignedTo,
  showFilters = true,
  onTodoClick,
  showAssigneeFilter = true
}) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['pending', 'in_progress']);
  const [showCreatedByMe, setShowCreatedByMe] = useState(false);
  const [showDue, setShowDue] = useState(false);
  const [showOverdue, setShowOverdue] = useState(false);
  const [sortBy, setSortBy] = useState('due_date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterAssignee, setFilterAssignee] = useState(assignedTo || 'all');
  const [profiles, setProfiles] = useState<any[]>([]);
  const { currentTenant } = useTenant();
  const { getVisibilityLevel, isAdmin } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentTenant?.id) {
      fetchTodos();
      if (showAssigneeFilter) {
        fetchProfiles();
      }
    }
  }, [currentTenant?.id, entityType, entityId, assignedTo, filterAssignee]);

  // Real-time subscription for live updates
  useEffect(() => {
    if (!currentTenant?.id) return;

    const channel = supabase
      .channel('todos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `tenant_id=eq.${currentTenant.id}`
        },
        (payload) => {
          console.log('Todo change detected:', payload);
          // Optimistically update UI for better UX
          if (payload.eventType === 'UPDATE' && payload.new) {
            setTodos(prevTodos => 
              prevTodos.map(todo => 
                todo.id === payload.new.id 
                  ? { ...todo, ...payload.new }
                  : todo
              )
            );
          }
          // Still fetch to ensure consistency
          setTimeout(() => fetchTodos(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id]);

  const fetchProfiles = async () => {
    try {
      const { data: profilesData } = await supabase
        .from('user_tenant_memberships')
        .select(`
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true);

      if (profilesData) {
        const profilesList = profilesData
          .map((membership: any) => membership.profiles)
          .filter(Boolean);
        setProfiles(profilesList);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchTodos = async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('todos')
        .select(`
          *,
          assigned_profile:profiles!assigned_to(first_name, last_name),
          contact:contacts(first_name, last_name)
        `)
        .eq('tenant_id', currentTenant.id);

      // Apply visibility filtering (admin gets full access automatically)
      if (!isAdmin && !entityType && !entityId) { // Only apply visibility filtering for general todo views
        const visibilityLevel = await getVisibilityLevel('todos');
        
        switch (visibilityLevel) {
          case 'own':
            query = query.eq('assigned_to', user.id);
            break;
          case 'department':
            // Get user's department colleagues
            const { data: deptUsers } = await supabase
              .from('user_department_assignments')
              .select(`
                user_id,
                department:departments!inner(
                  user_assignments:user_department_assignments(user_id)
                )
              `)
              .eq('user_id', user.id)
              .eq('tenant_id', currentTenant?.id);
            
            if (deptUsers?.[0]?.department?.user_assignments) {
              const deptUserIds = deptUsers[0].department.user_assignments.map((u: any) => u.user_id);
              query = query.in('assigned_to', deptUserIds);
            } else {
              query = query.eq('assigned_to', user.id); // Fallback to own
            }
            break;
          case 'branch':
            // Get user's branch colleagues
            const { data: branchUsers } = await supabase
              .from('user_department_assignments')
              .select(`
                user_id,
                departments!inner(
                  branch_id,
                  branch_departments:departments!branch_id(
                    user_assignments:user_department_assignments(user_id)
                  )
                )
              `)
              .eq('user_id', user.id)
              .eq('tenant_id', currentTenant?.id);
            
            if (branchUsers?.[0]?.departments?.branch_departments) {
              const branchUserIds = branchUsers[0].departments.branch_departments
                .flatMap((d: any) => d.user_assignments.map((u: any) => u.user_id));
              query = query.in('assigned_to', branchUserIds);
            } else {
              query = query.eq('assigned_to', user.id); // Fallback to own
            }
            break;
          case 'all':
            // No additional filtering needed
            break;
          default:
            query = query.eq('assigned_to', user.id); // Default to own
        }
      }

      // Filter by entity if specified
      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId);
      }

      // Filter by assigned user if specified
      if (assignedTo) {
        query = query.eq('assigned_to', assignedTo);
      } else if (filterAssignee && filterAssignee !== 'all') {
        query = query.eq('assigned_to', filterAssignee);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch entity names for each todo
      const todosWithEntityNames = await Promise.all(
        (data || []).map(async (todo) => {
          const entityName = await fetchEntityName(todo.entity_type, todo.entity_id);
          return { ...todo, entity_name: entityName };
        })
      );

      setTodos(todosWithEntityNames);
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast({
        title: "Error",
        description: "Failed to load todos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityName = async (type: string, id: string): Promise<string> => {
    try {
      let query;
      switch (type) {
        case 'deal':
          query = supabase.from('deals').select('name').eq('id', id).single();
          break;
        case 'project':
          query = supabase.from('projects').select('name').eq('id', id).single();
          break;
        case 'contact':
          const { data: contact } = await supabase.from('contacts').select('first_name, last_name').eq('id', id).single();
          return contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown Contact';
        case 'company':
          query = supabase.from('companies').select('name').eq('id', id).single();
          break;
        case 'site':
          query = supabase.from('sites').select('name').eq('id', id).single();
          break;
        case 'contract':
          query = supabase.from('contracts').select('name').eq('id', id).single();
          break;
        default:
          return 'Unknown Entity';
      }

      const { data } = await query;
      return data?.name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  const toggleTodoCompletion = async (todoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    // Optimistic UI update
    setTodos(prevTodos => 
      prevTodos.map(todo => 
        todo.id === todoId 
          ? { 
              ...todo, 
              status: newStatus as any,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null
            }
          : todo
      )
    );
    
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
          completed_by: newStatus === 'completed' ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', todoId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Todo ${newStatus === 'completed' ? 'completed' : 'reopened'}`,
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      // Revert optimistic update on error
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === todoId 
            ? { ...todo, status: currentStatus as any }
            : todo
        )
      );
      toast({
        title: "Error",
        description: "Failed to update todo",
        variant: "destructive",
      });
    }
  };

  const deleteTodo = async (todoId: string) => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;

      // Update local state immediately
      setTodos(prev => prev.filter(todo => todo.id !== todoId));

      toast({
        title: "Success",
        description: "Todo deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast({
        title: "Error",
        description: "Failed to delete todo",
        variant: "destructive",
      });
    }
  };

  const navigateToEntity = (todo: Todo) => {
    const routes: { [key: string]: string } = {
      deal: `/deals/${todo.entity_id}`,
      project: `/projects/${todo.entity_id}`, 
      contact: `/contacts/${todo.entity_id}`,
      company: `/companies/${todo.entity_id}`,
      site: `/sites/${todo.entity_id}`,
      contract: `/contracts/${todo.entity_id}`
    };
    
    const route = routes[todo.entity_type];
    if (route) {
      navigate(route);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const filteredAndSortedTodos = useMemo(() => {
    return todos.filter(todo => {
      // Search filter
      const matchesSearch = !searchTerm || 
        todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        todo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        todo.entity_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(todo.status);

      // Due filter - show todos that have a due date and are not completed
      const matchesDue = !showDue || (todo.due_date && todo.status !== 'completed');

      // Overdue filter - show todos that are past their due date and not completed
      const matchesOverdue = !showOverdue || (todo.due_date && isPast(new Date(todo.due_date)) && !isToday(new Date(todo.due_date)) && todo.status !== 'completed');

      // Created by me filter - simplified for now
      const matchesCreatedBy = !showCreatedByMe || true; // Will be implemented properly later

      return matchesSearch && matchesStatus && matchesDue && matchesOverdue && matchesCreatedBy;
    }).sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        // If same priority, sort by created_at (recent first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      let aValue: any = a[sortBy as keyof Todo];
      let bValue: any = b[sortBy as keyof Todo];

      if (sortBy === 'due_date') {
        aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
        bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [todos, searchTerm, selectedStatuses, showDue, showOverdue, showCreatedByMe, sortBy, sortOrder]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDueDateColor = (dueDate?: string) => {
    if (!dueDate) return 'text-muted-foreground';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-red-500';
    if (isToday(date)) return 'text-orange-500';
    if (isTomorrow(date)) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const categorizedTodos = useMemo(() => {
    if (sortBy === 'due_date') {
      return {
        overdue: filteredAndSortedTodos.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'completed'),
        today: filteredAndSortedTodos.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'completed'),
        tomorrow: filteredAndSortedTodos.filter(t => t.due_date && isTomorrow(new Date(t.due_date)) && t.status !== 'completed'),
        laterThisWeek: filteredAndSortedTodos.filter(t => t.due_date && isThisWeek(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && !isTomorrow(new Date(t.due_date)) && t.status !== 'completed'),
        laterThisMonth: filteredAndSortedTodos.filter(t => {
          if (!t.due_date || t.status === 'completed') return false;
          const date = new Date(t.due_date);
          return isThisMonth(date) && !isThisWeek(date);
        }),
        laterThisYear: filteredAndSortedTodos.filter(t => {
          if (!t.due_date || t.status === 'completed') return false;
          const date = new Date(t.due_date);
          return isThisYear(date) && !isThisMonth(date);
        }),
        future: filteredAndSortedTodos.filter(t => {
          if (!t.due_date || t.status === 'completed') return false;
          const date = new Date(t.due_date);
          return isFuture(date) && !isThisYear(date);
        }),
        noDueDate: filteredAndSortedTodos.filter(t => !t.due_date && t.status !== 'completed'),
        completed: filteredAndSortedTodos.filter(t => t.status === 'completed')
      };
    } else if (sortBy === 'priority') {
      return {
        urgent: filteredAndSortedTodos.filter(t => t.priority === 'urgent'),
        high: filteredAndSortedTodos.filter(t => t.priority === 'high'),
        medium: filteredAndSortedTodos.filter(t => t.priority === 'medium'),
        low: filteredAndSortedTodos.filter(t => t.priority === 'low')
      };
    } else {
      // Default categorization by status
      return {
        overdue: filteredAndSortedTodos.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== 'completed'),
        today: filteredAndSortedTodos.filter(t => t.due_date && isToday(new Date(t.due_date)) && t.status !== 'completed'),
        tomorrow: filteredAndSortedTodos.filter(t => t.due_date && isTomorrow(new Date(t.due_date)) && t.status !== 'completed'),
        thisWeek: filteredAndSortedTodos.filter(t => t.due_date && isThisWeek(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && !isTomorrow(new Date(t.due_date)) && t.status !== 'completed'),
        noDueDate: filteredAndSortedTodos.filter(t => !t.due_date && t.status !== 'completed'),
        completed: filteredAndSortedTodos.filter(t => t.status === 'completed')
      };
    }
  }, [filteredAndSortedTodos, sortBy]);

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search todos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={sortOrder === 'asc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['pending', 'in_progress', 'completed'].map(status => (
              <Button
                key={status}
                variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleStatusFilter(status)}
              >
                {status.replace('_', ' ')}
              </Button>
            ))}
            
            <Button
              variant={showDue ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowDue(!showDue)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Due
            </Button>

            <Button
              variant={showOverdue ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOverdue(!showOverdue)}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Overdue
            </Button>
            
            <Button
              variant={showCreatedByMe ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowCreatedByMe(!showCreatedByMe)}
            >
              Created by me
            </Button>

            {showAssigneeFilter && profiles.length > 0 && (
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="categorized" className="w-full">
        <TabsList>
          <TabsTrigger value="categorized">Categorized</TabsTrigger>
          <TabsTrigger value="all">All ({filteredAndSortedTodos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="categorized" className="space-y-6">
          {Object.entries(categorizedTodos).map(([category, todos]) => (
            todos.length > 0 && (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 capitalize">
                  {category.replace(/([A-Z])/g, ' $1').replace(/later this/g, 'Later This')} ({todos.length})
                </h3>
                <div className="grid gap-3">
                  {todos.map(todo => (
                    <TodoCard 
                      key={todo.id} 
                      todo={todo} 
                      onToggleComplete={toggleTodoCompletion}
                      onDelete={deleteTodo}
                      onEntityClick={navigateToEntity}
                      onClick={onTodoClick}
                    />
                  ))}
                </div>
              </div>
            )
          ))}
        </TabsContent>

        <TabsContent value="all">
          <div className="grid gap-3">
            {filteredAndSortedTodos.map(todo => (
              <TodoCard 
                key={todo.id} 
                todo={todo} 
                onToggleComplete={toggleTodoCompletion}
                onDelete={deleteTodo}
                onEntityClick={navigateToEntity}
                onClick={onTodoClick}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading todos...</p>
        </div>
      )}

      {!loading && filteredAndSortedTodos.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No todos found</p>
        </div>
      )}
    </div>
  );
};

interface TodoCardProps {
  todo: Todo;
  onToggleComplete: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onEntityClick: (todo: Todo) => void;
  onClick?: (todo: Todo) => void;
}

const TodoCard: React.FC<TodoCardProps> = ({ 
  todo, 
  onToggleComplete, 
  onDelete, 
  onEntityClick,
  onClick 
}) => {
  const getDueDateColor = (dueDate?: string) => {
    if (!dueDate) return 'text-muted-foreground';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-red-500';
    if (isToday(date)) return 'text-orange-500';
    if (isTomorrow(date)) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className={cn(
      "group transition-all hover:shadow-md cursor-pointer",
      todo.status === 'completed' && "opacity-60"
    )} onClick={() => {
      console.log('TodoCard clicked:', todo.title, todo.id);
      onClick?.(todo);
    }}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={todo.status === 'completed'}
            onCheckedChange={(checked) => {
              console.log('Checkbox toggled:', todo.id, checked);
              onToggleComplete(todo.id, todo.status);
            }}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className={cn(
                  "font-medium mb-1",
                  todo.status === 'completed' && "line-through text-muted-foreground"
                )}>
                  {todo.title}
                </h4>
                
                {todo.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {todo.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant={getPriorityColor(todo.priority)} className="text-xs">
                    {todo.priority}
                  </Badge>
                  
                  <div className="flex items-center gap-1">
                    {getStatusIcon(todo.status)}
                    <span className="text-xs text-muted-foreground">
                      {todo.status.replace('_', ' ')}
                    </span>
                  </div>

                  {todo.due_date && (
                    <div className={cn("flex items-center gap-1 text-xs", getDueDateColor(todo.due_date))}>
                      <Calendar className="h-3 w-3" />
                      {format(new Date(todo.due_date), 'MMM dd')}
                    </div>
                  )}

                  {/* Show assignees - prioritize todo_assignees over assigned_profile */}
                  {todo.todo_assignees && todo.todo_assignees.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {todo.todo_assignees.length === 1 ? (
                        <span>
                          {todo.todo_assignees[0].profiles.first_name} {todo.todo_assignees[0].profiles.last_name}
                        </span>
                      ) : (
                        <span>
                          {todo.todo_assignees.length} assignees
                        </span>
                      )}
                    </div>
                  ) : todo.assigned_profile ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {todo.assigned_profile.first_name} {todo.assigned_profile.last_name}
                    </div>
                  ) : null}
                </div>

                {todo.entity_name && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Entity button clicked:', todo.entity_type, todo.entity_name);
                        onEntityClick(todo);
                      }}
                      className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {todo.entity_type}: {todo.entity_name}
                    </Button>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Delete button clicked:', todo.id);
                  onDelete(todo.id);
                }}
                className="text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};