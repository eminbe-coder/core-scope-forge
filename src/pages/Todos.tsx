import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  List,
  CheckCircle,
  Circle,
  Clock,
  User
} from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, isPast } from 'date-fns';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  type: 'task' | 'call' | 'meeting' | 'email';
  assigned_user: {
    first_name: string;
    last_name: string;
  } | null;
  created_user: {
    first_name: string;
    last_name: string;
  };
  entity_type?: string;
  entity_name?: string;
  created_at: string;
}

const Todos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTodos = async () => {
    if (!currentTenant || !user) return;

    try {
      setLoading(true);
      
      const { data: activities, error } = await supabase
        .from('activities')
        .select('*')
        .eq('assigned_to', user.id)
        .in('type', ['task', 'call', 'meeting', 'email'])
        .order('due_date', { ascending: true });

      if (error) throw error;

      const todosWithUsers: Todo[] = [];

      for (const activity of activities || []) {
        // Get assigned user
        const { data: assignedUser } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', activity.assigned_to)
          .single();

        // Get created user
        const { data: createdUser } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', activity.created_by)
          .single();

        // Get entity information
        let entityName = '';
        let entityType = '';
        
        if (activity.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('first_name, last_name')
            .eq('id', activity.contact_id)
            .single();
          entityName = contact ? `${contact.first_name} ${contact.last_name}` : '';
          entityType = 'contact';
        } else if (activity.company_id) {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', activity.company_id)
            .single();
          entityName = company?.name || '';
          entityType = 'company';
        } else if (activity.site_id) {
          const { data: site } = await supabase
            .from('sites')
            .select('name')
            .eq('id', activity.site_id)
            .single();
          entityName = site?.name || '';
          entityType = 'site';
        } else if (activity.customer_id) {
          const { data: customer } = await supabase
            .from('customers')
            .select('name')
            .eq('id', activity.customer_id)
            .single();
          entityName = customer?.name || '';
          entityType = 'customer';
        } else if (activity.deal_id) {
          const { data: deal } = await supabase
            .from('deals')
            .select('name')
            .eq('id', activity.deal_id)
            .single();
          entityName = deal?.name || '';
          entityType = 'deal';
        }

        if (createdUser) {
          todosWithUsers.push({
            id: activity.id,
            title: activity.title,
            description: activity.description,
            due_date: activity.due_date,
            completed: activity.completed,
            completed_at: activity.completed_at,
            type: activity.type as 'task' | 'call' | 'meeting' | 'email',
            assigned_user: assignedUser,
            created_user: createdUser,
            entity_type: entityType,
            entity_name: entityName,
            created_at: activity.created_at,
          });
        }
      }

      setTodos(todosWithUsers);
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load todos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTodoComplete = async (todoId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ 
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq('id', todoId);

      if (error) throw error;

      await fetchTodos();
      toast({
        title: 'Success',
        description: `Todo ${!completed ? 'completed' : 'reopened'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         todo.entity_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'completed' && todo.completed) ||
                         (filterStatus === 'pending' && !todo.completed);
    
    return matchesSearch && matchesStatus;
  });

  const todayTodos = filteredTodos.filter(todo => 
    todo.due_date && isToday(new Date(todo.due_date))
  );

  const tomorrowTodos = filteredTodos.filter(todo =>
    todo.due_date && isTomorrow(new Date(todo.due_date))
  );

  const thisWeekTodos = filteredTodos.filter(todo =>
    todo.due_date && isThisWeek(new Date(todo.due_date)) && 
    !isToday(new Date(todo.due_date)) && !isTomorrow(new Date(todo.due_date))
  );

  const overdueTodos = filteredTodos.filter(todo =>
    todo.due_date && isPast(new Date(todo.due_date)) && !todo.completed
  );

  const selectedDateTodos = filteredTodos.filter(todo =>
    selectedDate && todo.due_date && 
    format(new Date(todo.due_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  );

  useEffect(() => {
    fetchTodos();
  }, [currentTenant, user]);

  const getTodoTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-blue-500';
      case 'call': return 'bg-green-500';
      case 'meeting': return 'bg-purple-500';
      case 'email': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const renderTodoCard = (todo: Todo) => (
    <Card key={todo.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            {todo.completed ? (
              <CheckCircle 
                className="h-5 w-5 text-green-600 cursor-pointer"
                onClick={() => toggleTodoComplete(todo.id, todo.completed)}
              />
            ) : (
              <Circle 
                className="h-5 w-5 text-gray-400 cursor-pointer hover:text-gray-600"
                onClick={() => toggleTodoComplete(todo.id, todo.completed)}
              />
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                {todo.title}
              </span>
              <Badge 
                variant="secondary" 
                className={`text-white text-xs ${getTodoTypeColor(todo.type)}`}
              >
                {todo.type}
              </Badge>
            </div>
            
            {todo.description && (
              <p className={`text-sm text-muted-foreground ${todo.completed ? 'line-through' : ''}`}>
                {todo.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {todo.entity_name && (
                <span className="bg-muted px-2 py-1 rounded">
                  {todo.entity_type}: {todo.entity_name}
                </span>
              )}
              
              {todo.due_date && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due: {format(new Date(todo.due_date), 'MMM d, yyyy')}
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {todo.assigned_user ? 
                  `${todo.assigned_user.first_name} ${todo.assigned_user.last_name}` :
                  `${todo.created_user.first_name} ${todo.created_user.last_name}`
                }
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading todos...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My To-Dos</h1>
            <p className="text-muted-foreground">
              Manage all your tasks and activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={activeView === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('list')}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={activeView === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('calendar')}
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Calendar
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search todos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeView === 'list' ? (
          <div className="space-y-6">
            {overdueTodos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-3">Overdue ({overdueTodos.length})</h3>
                <div className="space-y-3">
                  {overdueTodos.map(renderTodoCard)}
                </div>
              </div>
            )}

            {todayTodos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Today ({todayTodos.length})</h3>
                <div className="space-y-3">
                  {todayTodos.map(renderTodoCard)}
                </div>
              </div>
            )}

            {tomorrowTodos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Tomorrow ({tomorrowTodos.length})</h3>
                <div className="space-y-3">
                  {tomorrowTodos.map(renderTodoCard)}
                </div>
              </div>
            )}

            {thisWeekTodos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">This Week ({thisWeekTodos.length})</h3>
                <div className="space-y-3">
                  {thisWeekTodos.map(renderTodoCard)}
                </div>
              </div>
            )}

            {filteredTodos.filter(todo => !todo.due_date).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">No Due Date</h3>
                <div className="space-y-3">
                  {filteredTodos.filter(todo => !todo.due_date).map(renderTodoCard)}
                </div>
              </div>
            )}

            {filteredTodos.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No todos found</h3>
                  <p className="text-muted-foreground text-center max-w-sm">
                    You don't have any todos assigned to you. Create some tasks to get started!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateTodos.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No todos for this date
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateTodos.map(renderTodoCard)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Todos;