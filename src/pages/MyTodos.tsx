import { MobileLayout } from '@/components/layout/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { TodoListEnhanced } from '@/components/todos/TodoListEnhanced';
import { TodoCalendarView } from '@/components/todos/TodoCalendarView';
import { QuickAddTodoForm } from '@/components/todos/QuickAddTodoForm';
import { TodoDetailModal } from '@/components/todos/TodoDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle, Clock, AlertTriangle, List, Calendar, Save, Users } from 'lucide-react';
import { WorkingHoursSettings } from '@/components/todos/WorkingHoursSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useTodoPreferences } from '@/hooks/use-todo-preferences';
import { useUrlState } from '@/hooks/use-url-state';
import { usePermissions } from '@/hooks/use-permissions';

const MyTodos = () => {
  const isMobile = useIsMobile();
  const { currentTenant } = useTenant();
  const { preferences, updatePreference, saveCurrentPreferences } = useTodoPreferences();
  const { getVisibilityLevel, isAdmin } = usePermissions();
  const [selectedTodoId, setSelectedTodoId] = useUrlState('todo', '');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    dueToday: 0
  });
  const [todos, setTodos] = useState<any[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (currentTenant?.id) {
      fetchStats();
      fetchProfiles();
    }
  }, [currentTenant?.id, selectedUserId]); // Added selectedUserId to dependency array

  useEffect(() => {
    if (currentTenant?.id && selectedUserId) {
      fetchStats(); // Use the main fetch function instead
    }
  }, [currentTenant?.id, selectedUserId]);

  // Handle URL state for selected todo
  useEffect(() => {
    if (selectedTodoId && todos.length > 0) {
      const todo = todos.find(t => t.id === selectedTodoId);
      if (todo) {
        setSelectedTodo(todo);
        setIsDetailModalOpen(true);
      }
    } else {
      setSelectedTodo(null);
      setIsDetailModalOpen(false);
    }
  }, [selectedTodoId, todos]);

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
        
        // Set default selection to "All" instead of current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          setSelectedUserId(''); // Start with "All" selected
        }
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user); // Store user in state

      let query = supabase
        .from('todos')
        .select(`
          *,
          assigned_profile:profiles!assigned_to(first_name, last_name),
          todo_types(name, color, icon)
        `)
        .eq('tenant_id', currentTenant?.id);

      // Apply visibility filtering (admin gets full access automatically)
      if (!isAdmin) {
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

      // Apply assignee filter if a specific user is selected
      if (selectedUserId) {
        query = query.eq('assigned_to', selectedUserId);
      }

      const { data: todosData } = await query;

      if (todosData) {
        setTodos(todosData);
        
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
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTodoClick = (todo: any) => {
    setSelectedTodoId(todo.id);
  };

  const handleDetailModalClose = () => {
    setSelectedTodoId('');
  };

  const handleCalendarPreferencesChange = (newPreferences: any) => {
    Object.entries(newPreferences).forEach(([key, value]) => {
      updatePreference(key as keyof typeof preferences, value);
    });
  };

  const handleEventDrop = async (args: { event: any; start: Date; end: Date }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todoId = args.event.id;
      const newDueDate = args.start.toISOString().split('T')[0];
      const newDueTime = args.start.toTimeString().split(' ')[0];

      const { error } = await supabase
        .from('todos')
        .update({ 
          due_date: newDueDate,
          due_time: newDueTime
        })
        .eq('id', todoId);

      if (error) {
        console.error('Error updating todo due date:', error);
        return;
      }

      // Refresh data
      fetchStats(); // Use unified function
    } catch (error) {
      console.error('Error updating todo due date:', error);
    }
  };

  return (
    <MobileLayout headerTitle={isMobile ? "To-Dos" : undefined}>
      <div className="space-y-6">
        {!isMobile && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">To-Dos</h1>
              <p className="text-muted-foreground">
                Manage all your to-do items across the platform
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-md p-1">
                <Button
                  variant={preferences.view_type === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => updatePreference('view_type', 'list')}
                  className="h-8"
                >
                  <List className="h-4 w-4 mr-1" />
                  List
                </Button>
                <Button
                  variant={preferences.view_type === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => updatePreference('view_type', 'calendar')}
                  className="h-8"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Calendar
                </Button>
              </div>
              <WorkingHoursSettings />
              <Button
                variant="outline"
                size="sm"
                onClick={saveCurrentPreferences}
                className="h-8"
              >
                <Save className="h-4 w-4 mr-1" />
                Save View
              </Button>
              <QuickAddTodoForm
                onSuccess={fetchStats}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Add To-Do
                  </Button>
                }
              />
            </div>
          </div>
        )}

        {isMobile && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex bg-muted rounded-md p-1">
              <Button
                variant={preferences.view_type === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => updatePreference('view_type', 'list')}
                className="h-8"
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={preferences.view_type === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => updatePreference('view_type', 'calendar')}
                className="h-8"
              >
                <Calendar className="h-4 w-4 mr-1" />
                Calendar
              </Button>
            </div>
            <QuickAddTodoForm
              onSuccess={fetchStats}
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              }
            />
          </div>
        )}

        {/* Stats Overview */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-5'}`}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Today</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.dueToday}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Todo Content */}
        {preferences.view_type === 'list' ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Task List</CardTitle>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedUserId || 'all'} onValueChange={(value) => setSelectedUserId(value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select assignee" />
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
                </div>
              </CardHeader>
              <CardContent>
                <TodoListEnhanced
                  assignedTo={selectedUserId}
                  onTodoClick={handleTodoClick}
                  showAssigneeFilter={false} // We have our own filter above
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Calendar View</CardTitle>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedUserId || 'all'} onValueChange={(value) => setSelectedUserId(value === 'all' ? '' : value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select assignee" />
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
                </div>
              </CardHeader>
              <CardContent>
                <TodoCalendarView
                  todos={todos}
                  onEventDrop={handleEventDrop}
                  onTodoClick={handleTodoClick}
                  onSelectEvent={(event) => {
                    console.log('Selected event:', event);
                  }}
                  preferences={preferences}
                  onPreferencesChange={handleCalendarPreferencesChange}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Todo Detail Modal */}
        <TodoDetailModal
          todo={selectedTodo}
          isOpen={isDetailModalOpen}
          onClose={handleDetailModalClose}
          onUpdate={fetchStats}
          canEdit={true}
        />
      </div>
    </MobileLayout>
  );
};

export default MyTodos;