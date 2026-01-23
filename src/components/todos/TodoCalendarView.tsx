import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
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

interface ExternalFilters {
  searchTerm?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  timeframe?: 'all' | 'overdue' | 'due_today' | 'later';
  perspective?: 'my_assigned' | 'created_by_me' | 'all_accessible';
  showCompleted?: boolean;
}

interface TodoCalendarViewProps {
  todos: Todo[];
  onSelectEvent?: (event: any) => void;
  onSelectSlot?: (slotInfo: any) => void;
  onEventDrop?: (args: { event: any; start: Date; end: Date }) => void;
  onTodoClick?: (todo: Todo) => void;
  onViewChange?: (view: View) => void;
  defaultView?: View;
  preferences?: {
    calendar_height?: number;
    calendar_view?: string;
    calendar_date?: string;
    column_widths?: { [key: string]: number };
    time_slot_height?: number;
  };
  onPreferencesChange?: (preferences: any) => void;
  externalFilters?: ExternalFilters;
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
  preferences,
  onPreferencesChange,
  externalFilters,
}) => {
  const [currentView, setCurrentView] = useState<View>(preferences?.calendar_view as View || defaultView);
  const [currentDate, setCurrentDate] = useState(preferences?.calendar_date ? new Date(preferences.calendar_date) : new Date());
  const [calendarHeight, setCalendarHeight] = useState(preferences?.calendar_height || 700);
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(preferences?.column_widths || {});
  const [timeSlotHeight, setTimeSlotHeight] = useState(preferences?.time_slot_height || 30);
  const { workingHours, calculateStartTime, isWorkingTime } = useWorkingHours();
  const resizeRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [isResizingColumn, setIsResizingColumn] = useState<string | null>(null);
  const [isResizingTimeSlot, setIsResizingTimeSlot] = useState(false);
  const events: CalendarEvent[] = useMemo(() => {
    let filteredTodos = todos;

    // Apply external filters if provided
    if (externalFilters) {
      const currentUser = null; // We'd need to get this from auth
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filteredTodos = todos.filter(todo => {
        // Search filter
        if (externalFilters.searchTerm && !todo.title.toLowerCase().includes(externalFilters.searchTerm.toLowerCase())) {
          return false;
        }

        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
        const timeframe = externalFilters.timeframe || 'all';

        // Handle completed filter - if OFF, hide completed tasks; if ON, show all statuses
        if (!externalFilters.showCompleted && todo.status === 'completed') {
          return false;
        }

        // If showing completed and task is completed, include it
        if (externalFilters.showCompleted && todo.status === 'completed') {
          return true;
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
    }

    return filteredTodos
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
  }, [todos, calculateStartTime, externalFilters]);

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

  const snapToTimeSlot = (date: Date, snapToMinutes: number = 5): Date => {
    const newDate = new Date(date);
    const minutes = newDate.getMinutes();
    const remainder = minutes % snapToMinutes;
    
    if (remainder < snapToMinutes / 2) {
      newDate.setMinutes(minutes - remainder);
    } else {
      newDate.setMinutes(minutes + (snapToMinutes - remainder));
    }
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  };

  const handleEventDrop = useCallback((args: { event: any; start: Date; end: Date }) => {
    // Snap to 5-minute intervals for smoother movement
    const snappedStart = snapToTimeSlot(args.start, 5);
    const snappedEnd = snapToTimeSlot(args.end, 5);
    
    if (onEventDrop) {
      onEventDrop({
        ...args,
        start: snappedStart,
        end: snappedEnd
      });
    }
  }, [onEventDrop]);

  const handleEventResize = useCallback((args: { event: any; start: Date; end: Date }) => {
    // Snap to 5-minute intervals and calculate duration
    const snappedStart = snapToTimeSlot(args.start, 5);
    const snappedEnd = snapToTimeSlot(args.end, 5);
    
    // Calculate duration in minutes
    const durationMs = snappedEnd.getTime() - snappedStart.getTime();
    const durationMinutes = Math.max(5, Math.round(durationMs / (1000 * 60)));
    
    // Update the event with new duration
    const updatedEvent = {
      ...args,
      start: snappedStart,
      end: snappedEnd,
      resource: {
        ...args.event.resource,
        duration: durationMinutes
      }
    };
    
    if (onEventDrop) {
      onEventDrop(updatedEvent);
    }
  }, [onEventDrop]);

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    onPreferencesChange?.({
      calendar_view: view
    });
    if (onViewChange) {
      onViewChange(view);
    }
  };

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
    onPreferencesChange?.({
      calendar_date: date.toISOString()
    });
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
      // Save preferences when calendar height is resized
      onPreferencesChange?.({
        calendar_height: newHeight
      });
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

  // Column resizing functionality
  const handleColumnResize = useCallback((e: MouseEvent, columnIndex: string) => {
    if (!calendarRef.current || !isResizingColumn) return;
    
    const rect = calendarRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const minWidth = 100;
    const maxWidth = 400;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, relativeX));
    
    setColumnWidths(prev => {
      const newWidths = {
        ...prev,
        [columnIndex]: newWidth
      };
      // Save preferences when column is resized
      onPreferencesChange?.({
        column_widths: newWidths
      });
      return newWidths;
    });
  }, [isResizingColumn, onPreferencesChange]);

  const startColumnResize = (e: React.MouseEvent, columnIndex: string) => {
    e.preventDefault();
    setIsResizingColumn(columnIndex);
    
    const handleMouseMove = (e: MouseEvent) => {
      handleColumnResize(e, columnIndex);
    };
    
    const handleMouseUp = () => {
      setIsResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Time slot resizing functionality
  const handleTimeSlotResize = useCallback((e: MouseEvent) => {
    if (!isResizingTimeSlot) return;
    
    const deltaY = e.movementY;
    const newHeight = Math.max(15, Math.min(60, timeSlotHeight + deltaY));
    setTimeSlotHeight(newHeight);
    // Save preferences when time slot is resized
    onPreferencesChange?.({
      time_slot_height: newHeight
    });
  }, [isResizingTimeSlot, timeSlotHeight, onPreferencesChange]);

  const startTimeSlotResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTimeSlot(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      handleTimeSlotResize(e);
    };
    
    const handleMouseUp = () => {
      setIsResizingTimeSlot(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Apply custom styles for resizable elements
  useEffect(() => {
    if (!calendarRef.current) return;
    
    // Apply column widths
    Object.entries(columnWidths).forEach(([columnIndex, width]) => {
      const columnElements = calendarRef.current?.querySelectorAll(
        `.rbc-time-header-cell:nth-child(${parseInt(columnIndex) + 2}), .rbc-day-slot:nth-child(${parseInt(columnIndex) + 1})`
      );
      columnElements?.forEach(el => {
        (el as HTMLElement).style.width = `${width}px`;
        (el as HTMLElement).style.minWidth = `${width}px`;
      });
    });

    // Apply time slot height
    const timeSlots = calendarRef.current?.querySelectorAll('.rbc-time-slot');
    timeSlots?.forEach(slot => {
      (slot as HTMLElement).style.height = `${timeSlotHeight}px`;
      (slot as HTMLElement).style.minHeight = `${timeSlotHeight}px`;
    });
  }, [columnWidths, timeSlotHeight]);

  // Add resize handles after calendar renders
  useEffect(() => {
    if (!calendarRef.current) return;

    const addResizeHandles = () => {
      // Add column resize handles
      const headerCells = calendarRef.current?.querySelectorAll('.rbc-time-header-cell');
      headerCells?.forEach((cell, index) => {
        if (index === 0) return; // Skip the first column (time gutter)
        
        const existingHandle = cell.querySelector('.column-resize-handle');
        if (existingHandle) return;
        
        const handle = document.createElement('div');
        handle.className = 'column-resize-handle';
        handle.style.cssText = `
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          cursor: col-resize;
          background: transparent;
          z-index: 10;
        `;
        
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          startColumnResize(e as any, index.toString());
        });
        
        handle.addEventListener('mouseenter', () => {
          handle.style.background = 'hsl(var(--primary) / 0.3)';
        });
        
        handle.addEventListener('mouseleave', () => {
          handle.style.background = 'transparent';
        });
        
        cell.appendChild(handle);
      });

      // Add time slot resize handle
      const timeGutter = calendarRef.current?.querySelector('.rbc-time-gutter');
      if (timeGutter && !timeGutter.querySelector('.timeslot-resize-handle')) {
        const handle = document.createElement('div');
        handle.className = 'timeslot-resize-handle';
        handle.style.cssText = `
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 4px;
          cursor: row-resize;
          background: transparent;
          z-index: 10;
        `;
        
        handle.addEventListener('mousedown', (e) => {
          startTimeSlotResize(e as any);
        });
        
        handle.addEventListener('mouseenter', () => {
          handle.style.background = 'hsl(var(--primary) / 0.3)';
        });
        
        handle.addEventListener('mouseleave', () => {
          handle.style.background = 'transparent';
        });
        
        timeGutter.appendChild(handle);
      }
    };

    // Add handles after a short delay to ensure calendar is rendered
    const timer = setTimeout(addResizeHandles, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [currentView, currentDate]);

  return (
    <div 
      ref={resizeRef}
      className="bg-background rounded-lg border p-4 relative resize-y overflow-auto"
      style={{ height: `${calendarHeight}px`, minHeight: '400px' }}
    >
      <div className="relative h-full">
        <WorkingHoursBackground />
        <div ref={calendarRef} className="h-full">
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
            step={5}
            timeslots={12}
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
        </div>
        <TimeIndicator />
      </div>
      
      {/* Resize handle for calendar height */}
      <div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-muted rounded-t cursor-row-resize flex items-center justify-center"
        onMouseDown={startResize}
      >
        <div className="w-4 h-0.5 bg-muted-foreground rounded"></div>
      </div>
    </div>
  );
};