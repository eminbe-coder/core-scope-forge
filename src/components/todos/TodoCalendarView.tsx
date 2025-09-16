import React, { useMemo } from 'react';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar-styles.css';

const DragAndDropCalendar = withDragAndDrop(Calendar);

const localizer = momentLocalizer(moment);

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
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
  onTodoClick?: (todo: Todo) => void;
}

interface CalendarEvent extends Event {
  resource: Todo;
}

export const TodoCalendarView: React.FC<TodoCalendarViewProps> = ({
  todos,
  onSelectEvent,
  onSelectSlot,
  onEventDrop,
  onTodoClick,
}) => {
  const events: CalendarEvent[] = useMemo(() => {
    return todos
      .filter(todo => todo.due_date)
      .map(todo => {
        let startDate: Date;
        let endDate: Date;
        
        if (todo.due_time) {
          // Combine date and time
          const dateTimeString = `${todo.due_date}T${todo.due_time}`;
          startDate = new Date(dateTimeString);
          endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour
        } else {
          // All day event
          startDate = new Date(todo.due_date!);
          endDate = new Date(todo.due_date!);
        }
        
        return {
          id: todo.id,
          title: todo.title,
          start: startDate,
          end: endDate,
          allDay: !todo.due_time,
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
      <div 
        className="p-1 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onTodoClick?.(todo);
        }}
      >
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
      <DragAndDropCalendar
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
        views={['week', 'day']}
        defaultView="week"
        step={15}
        timeslots={4}
        showMultiDayTimes
        className="todo-calendar"
        onEventDrop={onEventDrop ? handleEventDrop : undefined}
        onEventResize={onEventDrop ? handleEventDrop : undefined}
        draggableAccessor={() => !!onEventDrop}
        resizable={!!onEventDrop}
        min={new Date(0, 0, 0, 6, 0, 0)}
        max={new Date(0, 0, 0, 22, 0, 0)}
      />
    </div>
  );
};