import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { TodoList } from '@/components/todos/TodoList';
import { TodoCalendarView } from '@/components/todos/TodoCalendarView';
import { UnifiedTodoModal } from '@/components/todos/UnifiedTodoModal';
import { TodoFilters } from '@/components/todos/TodoFilters';
import { TodoFormTrigger } from '@/components/todos/TodoFormTrigger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle, Clock, AlertTriangle, ListTodo, Calendar, CalendarCheck, Save } from 'lucide-react';
import { WorkingHoursSettings } from '@/components/todos/WorkingHoursSettings';
import { AssigneeFilter } from '@/components/todos/AssigneeFilter';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useTodoPreferences } from '@/hooks/use-todo-preferences';
import { usePermissions } from '@/hooks/use-permissions';
import { toast } from 'sonner';

const MyTodos = () => {
  const { currentTenant } = useTenant();
  const { getVisibilityLevel, canViewEntity } = usePermissions();
  const { preferences, updatePreference, saveCurrentPreferences } = useTodoPreferences();
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    later: 0,
    overdue: 0,
    dueToday: 0
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize selected user IDs with current user
  useEffect(() => {
    const initializeDefaultFilter = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedUserIds.length === 0) {
        setSelectedUserIds([user.id]);
      }
    };
    
    if (currentTenant?.id) {
      initializeDefaultFilter();
    }
  }, [currentTenant?.id]);
  
  // Filter states for unified filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [timeframe, setTimeframe] = useState<'all' | 'overdue' | 'due_today' | 'later'>('all');
  const [perspective, setPerspective] = useState<'my_assigned' | 'created_by_me' | 'all_accessible'>('my_assigned');
  const [showCompleted, setShowCompleted] = useState(false);

  // Clear all filters to default state
  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSortBy('due_date');
    setSortOrder('asc');
    setTimeframe('all');
    setPerspective('my_assigned');
    setShowCompleted(false);
  };

  useEffect(() => {
    if (currentTenant?.id) {
      fetchStats();
    }
  }, [currentTenant?.id, selectedUserIds]);

  const fetchStats = async () => {
    if (!currentTenant?.id) return;

    try {
      const visibilityLevel = await getVisibilityLevel('todos');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log('Debug - Visibility level:', visibilityLevel);
      
      let filteredTodos = [];

      if (visibilityLevel === 'all') {
        // User can see all todos
        const { data: allTodos, error } = await supabase
          .from('todos')
          .select(`
            *,
            assigned_profile:profiles!assigned_to(first_name, last_name),
            assignees:todo_assignees(
              user_id,
              profiles!todo_assignees_user_id_fkey(id, first_name, last_name)
            ),
            contact:contacts(first_name, last_name)
          `)
          .eq('tenant_id', currentTenant.id)
          .is('deleted_at', null);

        if (error) {
          console.error('Error fetching todos:', error);
          return;
        }

        filteredTodos = allTodos || [];
      } else {
        // User can only see their assigned todos (assigned_to) or multi-assigned todos
        const { data: assignedTodos, error: assignedError } = await supabase
          .from('todos')
          .select(`
            *,
            assigned_profile:profiles!assigned_to(first_name, last_name),
            assignees:todo_assignees(
              user_id,
              profiles!todo_assignees_user_id_fkey(id, first_name, last_name)
            ),
            contact:contacts(first_name, last_name)
          `)
          .eq('tenant_id', currentTenant.id)
          .is('deleted_at', null)
          .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);

        if (assignedError) {
          console.error('Error fetching assigned todos:', assignedError);
          return;
        }

        // Also fetch todos where user is in multi-assignment
        const { data: multiAssignedTodos, error: multiError } = await supabase
          .from('todos')
          .select(`
            *,
            assigned_profile:profiles!assigned_to(first_name, last_name),
            assignees:todo_assignees(
              user_id,
              profiles!todo_assignees_user_id_fkey(id, first_name, last_name)
            ),
            contact:contacts(first_name, last_name)
          `)
          .eq('tenant_id', currentTenant.id)
          .is('deleted_at', null)
          .eq('todo_assignees.user_id', user.id);

        if (multiError) {
          console.error('Error fetching multi-assigned todos:', multiError);
          return;
        }

        // Combine and deduplicate
        const allUserTodos = [...(assignedTodos || []), ...(multiAssignedTodos || [])];
        filteredTodos = allUserTodos.filter((todo, index, self) => 
          index === self.findIndex(t => t.id === todo.id)
        );
      }

    // Add entity names to all todos
    filteredTodos = await Promise.all(
      filteredTodos.map(async (todo) => {
        const entityName = await fetchEntityName(todo.entity_type, todo.entity_id);
        return { ...todo, entity_name: entityName };
      })
    );

      // Apply user-based filtering if selectedUserIds is provided and not empty
      let userFilteredTodos = filteredTodos;
      if (selectedUserIds.length > 0) {
        userFilteredTodos = filteredTodos.filter(todo => {
          // Check main assignee
          if (todo.assigned_to && selectedUserIds.includes(todo.assigned_to)) return true;
          
          // Check assignees array
          if (todo.assignees && todo.assignees.some((a: any) => selectedUserIds.includes(a.user_id))) {
            return true;
          }
          
          return false;
        });
      }

      console.log('Debug - Total todos fetched:', filteredTodos.length);
      console.log('Debug - User filtered todos:', userFilteredTodos.length);
      console.log('Debug - Selected user IDs:', selectedUserIds);
      console.log('Debug - Visibility level:', visibilityLevel);

      setTodos(userFilteredTodos);

      // Calculate stats from filtered todos
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const totalActive = userFilteredTodos.filter(todo => todo.status !== 'completed').length;
      const completedThisMonth = userFilteredTodos.filter(todo => {
        if (todo.status !== 'completed' || !todo.completed_at) return false;
        const completedDate = new Date(todo.completed_at);
        return completedDate >= startOfMonth && completedDate <= endOfMonth;
      }).length;
      const overdue = userFilteredTodos.filter(todo => {
        if (todo.status === 'completed') return false;
        if (!todo.due_date) return false;
        const dueDate = new Date(todo.due_date);
        return dueDate < startOfDay;
      }).length;
      const dueToday = userFilteredTodos.filter(todo => {
        if (todo.status === 'completed') return false;
        if (!todo.due_date) return false;
        const dueDate = new Date(todo.due_date);
        return dueDate >= startOfDay && dueDate <= endOfDay;
      }).length;
      const later = userFilteredTodos.filter(todo => {
        if (todo.status === 'completed') return false;
        if (!todo.due_date) return true; // No due date = Later
        const dueDate = new Date(todo.due_date);
        return dueDate > endOfDay; // Future dates = Later
      }).length;

      setStats({
        total: totalActive,
        completed: completedThisMonth,
        later,
        overdue,
        dueToday
      });

    } catch (error) {
      console.error('Error in fetchStats:', error);
    }
  };

  const handleTodoClick = (todo: any) => {
    setSelectedTodo(todo);
    setIsDetailModalOpen(true);
  };

  const handleDetailModalClose = () => {
    setSelectedTodo(null);
    setIsDetailModalOpen(false);
  };

  const handleCalendarPreferencesChange = (newPreferences: any) => {
    Object.keys(newPreferences).forEach(key => {
      updatePreference(key as any, newPreferences[key]);
    });
  };

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await saveCurrentPreferences();
      toast.success('View preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save view preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEventDrop = async (args: { event: any; start: Date; end: Date }) => {
    const { event, start } = args;
    
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          due_date: start.toISOString().split('T')[0],
          due_time: start.toTimeString().split(' ')[0]
        })
        .eq('id', event.id);

      if (error) throw error;

      // Refresh the todos
      fetchStats();
    } catch (error) {
      console.error('Error updating todo:', error);
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

  // Get user-filtered todos for calendar view (already filtered in fetchStats)
  const userFilteredTodos = todos;

  return (
    <MobileLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">To-Do Page</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your to-do items
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <TodoFormTrigger
              onSuccess={fetchStats}
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add To-Do
                </Button>
              }
            />
            <Button
              variant={preferences.view_type === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updatePreference('view_type', 'list')}
            >
              <ListTodo className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button
              variant={preferences.view_type === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updatePreference('view_type', 'calendar')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSavePreferences}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save View'}
            </Button>
            <WorkingHoursSettings />
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Active</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Later</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.later}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Today</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.dueToday}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            </CardContent>
          </Card>
        </div>

        {/* Unified Filters */}
        <TodoFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          perspective={perspective}
          onPerspectiveChange={setPerspective}
          showCompleted={showCompleted}
          onShowCompletedChange={setShowCompleted}
          onClearAllFilters={handleClearAllFilters}
        />

        {/* Main Todo Content */}
        {preferences.view_type === 'list' ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>To-Do List</CardTitle>
                <AssigneeFilter 
                  selectedUserIds={selectedUserIds}
                  onSelectionChange={setSelectedUserIds}
                />
              </CardHeader>
              <CardContent>
                <TodoList
                  todos={todos}
                  onTodoClick={handleTodoClick}
                  showAssigneeFilter={false}
                  showFilters={false}
                  externalFilters={{
                    searchTerm,
                    sortBy,
                    sortOrder,
                    timeframe,
                    perspective,
                    showCompleted
                  }}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Calendar View</CardTitle>
                <AssigneeFilter 
                  selectedUserIds={selectedUserIds}
                  onSelectionChange={setSelectedUserIds}
                />
              </CardHeader>
              <CardContent>
                <div className="h-[700px]">
                  <TodoCalendarView
                    todos={userFilteredTodos}
                    onEventDrop={handleEventDrop}
                    onTodoClick={handleTodoClick}
                    preferences={preferences}
                    externalFilters={{
                      searchTerm,
                      sortBy,
                      sortOrder,
                      timeframe,
                      perspective,
                      showCompleted
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Todo Detail Modal */}
        {selectedTodo && (
          <UnifiedTodoModal
            todo={selectedTodo}
            isOpen={isDetailModalOpen}
            onClose={handleDetailModalClose}
            onUpdate={fetchStats}
          />
        )}
      </div>
    </MobileLayout>
  );
};

export default MyTodos;