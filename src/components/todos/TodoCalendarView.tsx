import React, { useMemo } from 'react';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-styles.css';

const localizer = momentLocalizer(moment);

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  type_id?: string;
  entity_type: string;
  entity_id: string;
  assigned_profile?: { first_name: string; last_name: string } | null;
  todo_types?: { name: string; color: string; icon: string } | null;
}

interface TodoCalendarViewProps {
  todos: Todo[];
  onSelectEvent?: (event: any) => void;
  onSelectSlot?: (slotInfo: any) => void;
  onEventDrop?: (args: { event: any; start: Date; end: Date }) => void;
}

interface CalendarEvent extends Event {
  resource: Todo;
}

export const TodoCalendarView: React.FC<TodoCalendarViewProps> = ({
  todos,
  onSelectEvent,
  onSelectSlot,
  onEventDrop,
}) => {
  const events: CalendarEvent[] = useMemo(() => {
    return todos
      .filter(todo => todo.due_date)
      .map(todo => {
        const dueDate = new Date(todo.due_date!);
        const isOverdue = dueDate < new Date() && todo.status !== 'completed';
        
        return {
          id: todo.id,
          title: todo.title,
          start: dueDate,
          end: dueDate,
          allDay: true,
          resource: todo,
        };
      });
  }, [todos]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const todo = event.resource;
    let backgroundColor = 'hsl(var(--primary))';
    let borderColor = 'hsl(var(--primary))';
    
    // Priority colors
    if (todo.priority === 'high') {
      backgroundColor = 'hsl(var(--destructive))';
      borderColor = 'hsl(var(--destructive))';
    } else if (todo.priority === 'medium') {
      backgroundColor = 'hsl(var(--warning))';
      borderColor = 'hsl(var(--warning))';
    } else if (todo.priority === 'low') {
      backgroundColor = 'hsl(var(--muted))';
      borderColor = 'hsl(var(--muted))';
    }

    // Status styles
    if (todo.status === 'completed') {
      backgroundColor = 'hsl(var(--success))';
      borderColor = 'hsl(var(--success))';
    } else if (todo.status === 'in_progress') {
      backgroundColor = 'hsl(var(--warning))';
      borderColor = 'hsl(var(--warning))';
    }

    // Overdue style
    const isOverdue = new Date(todo.due_date!) < new Date() && todo.status !== 'completed';
    if (isOverdue) {
      backgroundColor = 'hsl(var(--destructive))';
      borderColor = 'hsl(var(--destructive))';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '12px',
        opacity: todo.status === 'completed' ? 0.7 : 1,
      },
    };
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const todo = event.resource;
    const isOverdue = new Date(todo.due_date!) < new Date() && todo.status !== 'completed';
    
    return (
      <div className="p-1">
        <div className="flex items-center gap-1 text-xs">
          <span className="truncate">{todo.title}</span>
          {isOverdue && <span className="text-xs">⚠️</span>}
        </div>
        {todo.assigned_profile && (
          <div className="text-xs opacity-75">
            {todo.assigned_profile.first_name} {todo.assigned_profile.last_name}
          </div>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs px-1 py-0",
              todo.priority === 'high' && "bg-red-100 text-red-800",
              todo.priority === 'medium' && "bg-yellow-100 text-yellow-800",
              todo.priority === 'low' && "bg-gray-100 text-gray-800"
            )}
          >
            {todo.priority}
          </Badge>
        </div>
      </div>
    );
  };

  const handleEventDrop = (args: { event: any; start: Date; end: Date }) => {
    if (onEventDrop) {
      onEventDrop(args);
    }
  };

  return (
    <div className="h-[600px] bg-background rounded-lg border p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        onSelectEvent={onSelectEvent}
        onSelectSlot={onSelectSlot}
        selectable
        popup
        eventPropGetter={eventStyleGetter}
        components={{
          event: CustomEvent,
        }}
        views={['month', 'week', 'day']}
        defaultView="month"
        step={60}
        showMultiDayTimes
        className="todo-calendar"
        // Enable drag and drop if handler provided
        onEventDrop={onEventDrop ? handleEventDrop : undefined}
        draggableAccessor={() => !!onEventDrop}
      />
    </div>
  );
};