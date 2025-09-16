import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Calendar, momentLocalizer, Event, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWorkingHours } from '@/hooks/use-working-hours';
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
  duration?: number; // Duration in minutes
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
  onViewChange?: (view: View) => void;
  defaultView?: View;
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
  onViewChange,
  defaultView = 'week',
}) => {
  const [currentView, setCurrentView] = useState<View>(defaultView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarHeight, setCalendarHeight] = useState(700);
  const { workingHours, calculateStartTime, isWorkingTime } = useWorkingHours();
  const resizeRef = useRef<HTMLDivElement>(null);
  const events: CalendarEvent[] = useMemo(() => {
    return todos
      .filter(todo => todo.due_date)
      .map(todo => {
        let startDate: Date;
        let endDate: Date;
        
        if (todo.due_time) {
          // Combine date and time for timed events
          const dateTimeString = `${todo.due_date}T${todo.due_time}`;
          endDate = new Date(dateTimeString);
          
          // Calculate start time based on duration and working hours
          const durationMinutes = todo.duration || 10;
          if (calculateStartTime) {
            startDate = calculateStartTime(endDate, durationMinutes);
          } else {
            // Fallback: simple subtraction
            startDate = new Date(endDate.getTime() - durationMinutes * 60 * 1000);
          }
        } else {
          // All day event - show at top of calendar
          startDate = new Date(todo.due_date!);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(todo.due_date!);
          endDate.setHours(23, 59, 59, 999);
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
  }, [todos, calculateStartTime]);

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
    console.log('Event drop detected:', args);
    if (onEventDrop) {
      onEventDrop(args);
    }
  };

  const handleEventResize = (args: { event: any; start: Date; end: Date }) => {
    console.log('Event resize detected:', args);
    if (onEventDrop) {
      onEventDrop(args);
    }
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    if (onViewChange) {
      onViewChange(view);
    }
  };

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  // Working hours background component
  const WorkingHoursBackground = () => {
    if (!workingHours || currentView === 'month') return null;
    
    const startHour = parseInt(workingHours.start_time.split(':')[0]);
    const endHour = parseInt(workingHours.end_time.split(':')[0]);
    const totalHours = 16; // 6am to 10pm
    const workingStartPercent = ((startHour - 6) / totalHours) * 100;
    const workingEndPercent = ((endHour - 6) / totalHours) * 100;
    
    return (
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Working hours highlight */}
        <div 
          className="absolute left-0 right-0 bg-green-50 opacity-30"
          style={{ 
            top: `${workingStartPercent}%`, 
            height: `${workingEndPercent - workingStartPercent}%` 
          }}
        />
        {/* Non-working hours fade */}
        <div 
          className="absolute left-0 right-0 bg-gray-100 opacity-50"
          style={{ 
            top: '0%', 
            height: `${workingStartPercent}%` 
          }}
        />
        <div 
          className="absolute left-0 right-0 bg-gray-100 opacity-50"
          style={{ 
            top: `${workingEndPercent}%`, 
            height: `${100 - workingEndPercent}%` 
          }}
        />
      </div>
    );
  };

  // Enhanced time indicator with current day and time
  const TimeIndicator = () => {
    const now = new Date();
    const [currentTime, setCurrentTime] = useState(now);
    
    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000); // Update every minute
      
      return () => clearInterval(timer);
    }, []);
    
    if (currentView === 'month') return null;
    
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const topPercentage = ((hour - 6) * 60 + minute) / (16 * 60) * 100; // 6am to 10pm = 16 hours
    
    // Current day indicator (vertical line)
    const todayCol = currentView === 'week' && moment(currentDate).isSame(currentTime, 'week');
    const isToday = moment(currentDate).isSame(currentTime, 'day');
    
    return (
      <>
        {/* Current time horizontal line */}
        {isToday && (
          <div 
            className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
            style={{ top: `${topPercentage}%` }}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full -mt-1.5 -ml-1.5"></div>
            <div className="text-xs text-red-500 bg-white px-1 ml-4 -mt-3">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}
        
        {/* Current day vertical line for week view */}
        {todayCol && currentView === 'week' && (
          <div className="absolute top-0 bottom-0 border-l-2 border-red-300 opacity-50 z-10 pointer-events-none">
          </div>
        )}
      </>
    );
  };

  const handleResize = (e: MouseEvent) => {
    if (resizeRef.current) {
      const rect = resizeRef.current.getBoundingClientRect();
      const newHeight = Math.max(400, e.clientY - rect.top);
      setCalendarHeight(newHeight);
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
  };

  const stopResize = () => {
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
  };

  return (
    <div 
      ref={resizeRef}
      className="bg-background rounded-lg border p-4 relative resize-y overflow-auto"
      style={{ height: `${calendarHeight}px`, minHeight: '400px' }}
    >
      <div className="relative h-full">
        <WorkingHoursBackground />
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
          view={currentView}
          onView={handleViewChange}
          date={currentDate}
          onNavigate={handleNavigate}
          step={15}
          timeslots={4}
          showMultiDayTimes={true}
          allDayAccessor="allDay"
          className="todo-calendar resizable-calendar"
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          draggableAccessor={() => true}
          resizable={true}
          min={workingHours ? 
            new Date(0, 0, 0, parseInt(workingHours.start_time.split(':')[0]) - 1, 0, 0) : 
            new Date(0, 0, 0, 6, 0, 0)}
          max={workingHours ? 
            new Date(0, 0, 0, parseInt(workingHours.end_time.split(':')[0]) + 2, 0, 0) : 
            new Date(0, 0, 0, 22, 0, 0)}
          scrollToTime={workingHours ? 
            new Date(0, 0, 0, parseInt(workingHours.start_time.split(':')[0]), 0, 0) : 
            new Date(0, 0, 0, 8, 0, 0)}
          formats={{
            timeGutterFormat: 'h:mm A',
            eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
              localizer?.format(start, 'h:mm A', culture) + ' - ' + localizer?.format(end, 'h:mm A', culture),
            agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
              localizer?.format(start, 'h:mm A', culture) + ' - ' + localizer?.format(end, 'h:mm A', culture),
          }}
        />
        <TimeIndicator />
      </div>
      
      {/* Resize handle */}
      <div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-muted rounded-t cursor-row-resize flex items-center justify-center"
        onMouseDown={startResize}
      >
        <div className="w-4 h-0.5 bg-muted-foreground rounded"></div>
      </div>
    </div>
  );
};