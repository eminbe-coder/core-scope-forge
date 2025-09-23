import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, isSameDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date()),
  getDay,
  locales,
});

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  start_time?: string;
  duration?: number;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  assigned_profile?: { first_name: string; last_name: string };
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Todo;
}

interface TodoCalendarEnhancedProps {
  selectedUserId?: string;
  onTodoClick?: (todo: Todo) => void;
  onDateSelect?: (date: Date) => void;
}

export const TodoCalendarEnhanced: React.FC<TodoCalendarEnhancedProps> = ({
  selectedUserId,
  onTodoClick,
  onDateSelect
}) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState(selectedUserId || '');
  const [taskCounts, setTaskCounts] = useState<{ [date: string]: { [userId: string]: number } }>({});
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (currentTenant?.id) {
      fetchProfiles();
      fetchTodos();
      fetchTaskCounts();
    }
  }, [currentTenant?.id, selectedUser]);

  useEffect(() => {
    if (selectedUserId) {
      setSelectedUser(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', 
          await supabase
            .from('user_tenant_memberships')
            .select('user_id')
            .eq('tenant_id', currentTenant?.id)
            .eq('active', true)
            .then(({ data }) => data?.map(m => m.user_id) || [])
        );

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchTodos = async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('todos')
        .select(`
          *,
          assigned_profile:profiles!assigned_to(first_name, last_name)
        `)
        .eq('tenant_id', currentTenant.id)
        .not('due_date', 'is', null);

      if (selectedUser) {
        query = query.eq('assigned_to', selectedUser);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar todos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskCounts = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('todos')
        .select('due_date, assigned_to')
        .eq('tenant_id', currentTenant.id)
        .not('due_date', 'is', null)
        .neq('status', 'completed');

      if (error) throw error;

      const counts: { [date: string]: { [userId: string]: number } } = {};
      
      (data || []).forEach(todo => {
        if (todo.due_date && todo.assigned_to) {
          const dateKey = todo.due_date;
          if (!counts[dateKey]) counts[dateKey] = {};
          if (!counts[dateKey][todo.assigned_to]) counts[dateKey][todo.assigned_to] = 0;
          counts[dateKey][todo.assigned_to]++;
        }
      });

      setTaskCounts(counts);
    } catch (error) {
      console.error('Error fetching task counts:', error);
    }
  };

  const events: CalendarEvent[] = useMemo(() => {
    return todos
      .filter(todo => todo.due_date)
      .map(todo => {
        const dueDate = new Date(todo.due_date!);
        let startTime = dueDate;
        let endTime = new Date(dueDate);

        if (todo.start_time) {
          const [hours, minutes] = todo.start_time.split(':').map(Number);
          startTime = new Date(dueDate);
          startTime.setHours(hours, minutes);
        }

        if (todo.due_time) {
          const [hours, minutes] = todo.due_time.split(':').map(Number);
          endTime = new Date(dueDate);
          endTime.setHours(hours, minutes);
        } else if (todo.start_time && todo.duration) {
          endTime = new Date(startTime.getTime() + todo.duration * 60 * 1000);
        } else {
          // Default 1-hour duration
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        }

        return {
          id: todo.id,
          title: todo.title,
          start: startTime,
          end: endTime,
          resource: todo
        };
      });
  }, [todos]);

  const handleEventDrop = async ({ event, start, end }: any) => {
    try {
      const newDueDate = format(start, 'yyyy-MM-dd');
      const newStartTime = format(start, 'HH:mm');
      const newDueTime = format(end, 'HH:mm');

      const { error } = await supabase
        .from('todos')
        .update({
          due_date: newDueDate,
          start_time: newStartTime,
          due_time: newDueTime
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Todo schedule updated",
      });

      fetchTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
      toast({
        title: "Error",
        description: "Failed to update todo schedule",
        variant: "destructive",
      });
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const todo = event.resource;
    let backgroundColor = '#3b82f6'; // Default blue

    switch (todo.priority) {
      case 'urgent':
        backgroundColor = '#ef4444'; // Red
        break;
      case 'high':
        backgroundColor = '#f97316'; // Orange
        break;
      case 'medium':
        backgroundColor = '#3b82f6'; // Blue
        break;
      case 'low':
        backgroundColor = '#6b7280'; // Gray
        break;
    }

    if (todo.status === 'completed') {
      backgroundColor = '#10b981'; // Green
    } else if (todo.status === 'in_progress') {
      backgroundColor = '#8b5cf6'; // Purple
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: todo.status === 'completed' ? 0.6 : 1,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const CustomDateCellWrapper = ({ children, value }: any) => {
    const dateKey = format(value, 'yyyy-MM-dd');
    const dayTaskCounts = taskCounts[dateKey] || {};
    const currentUserTaskCount = selectedUser ? dayTaskCounts[selectedUser] || 0 : 0;
    const totalTaskCount = Object.values(dayTaskCounts).reduce((sum: number, count: number) => sum + count, 0);
    
    const getIndicatorColor = (count: number) => {
      if (count >= 10) return 'bg-red-500';
      if (count >= 5) return 'bg-yellow-500';
      if (count > 0) return 'bg-green-500';
      return '';
    };

    const displayCount = selectedUser ? currentUserTaskCount : totalTaskCount;
    const indicatorColor = getIndicatorColor(displayCount);

    return (
      <div className="rbc-date-cell relative">
        {children}
        {displayCount > 0 && (
          <div className={cn(
            "absolute top-1 right-1 w-2 h-2 rounded-full",
            indicatorColor
          )} />
        )}
        {displayCount > 0 && (
          <div className="absolute top-1 right-3 text-xs font-medium text-muted-foreground">
            {displayCount}
          </div>
        )}
      </div>
    );
  };

  const CustomEventComponent = ({ event }: { event: CalendarEvent }) => {
    const todo = event.resource;
    return (
      <div className="p-1">
        <div className="font-medium text-xs">{event.title}</div>
        {todo.assigned_profile && (
          <div className="text-xs opacity-80">
            {todo.assigned_profile.first_name} {todo.assigned_profile.last_name}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Todo Calendar</span>
            <div className="flex items-center gap-2">
              <Select value={selectedUser} onValueChange={(value) => setSelectedUser(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={view === Views.MONTH ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView(Views.MONTH)}
              >
                Month
              </Button>
              <Button
                variant={view === Views.WEEK ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView(Views.WEEK)}
              >
                Week
              </Button>
              <Button
                variant={view === Views.DAY ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView(Views.DAY)}
              >
                Day
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>10+ tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>5-10 tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>1-4 tasks</span>
              </div>
            </div>
          </div>

          <div className="h-96">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={(event) => onTodoClick?.(event.resource)}
              onSelectSlot={({ start }) => onDateSelect?.(start)}
              onEventDrop={handleEventDrop}
              draggableAccessor={() => true}
              resizable
              eventPropGetter={eventStyleGetter}
              components={{
                dateCellWrapper: CustomDateCellWrapper,
                event: CustomEventComponent
              }}
              popup
              style={{ height: '100%' }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};