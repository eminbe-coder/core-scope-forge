import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import { format, addDays, startOfDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { cn } from '@/lib/utils';

interface ScheduledTodo {
  id: string;
  title: string;
  start_time?: string;
  due_time?: string;
  duration?: number;
  priority?: string;
  status: string;
}

interface ConflictCalendarViewProps {
  userId: string;
  selectedDate: string;
  currentTodoId?: string;
}

export const ConflictCalendarView: React.FC<ConflictCalendarViewProps> = ({
  userId,
  selectedDate,
  currentTodoId
}) => {
  const { currentTenant } = useTenant();
  const [todos, setTodos] = useState<ScheduledTodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate);
  const [profile, setProfile] = useState<{ first_name: string; last_name: string } | null>(null);

  useEffect(() => {
    if (userId && viewDate && currentTenant?.id) {
      fetchScheduledTodos();
      fetchProfile();
    }
  }, [userId, viewDate, currentTenant?.id]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      
      if (data) setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchScheduledTodos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('id, title, start_time, due_time, duration, priority, status')
        .eq('tenant_id', currentTenant?.id)
        .eq('assigned_to', userId)
        .eq('due_date', viewDate)
        .is('deleted_at', null)
        .neq('status', 'completed')
        .order('start_time', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Filter out current todo if provided
      const filteredTodos = (data || []).filter(t => t.id !== currentTodoId);
      setTodos(filteredTodos);
    } catch (error) {
      console.error('Error fetching scheduled todos:', error);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const currentDate = parseISO(viewDate);
    const newDate = addDays(currentDate, direction === 'next' ? 1 : -1);
    setViewDate(format(newDate, 'yyyy-MM-dd'));
  };

  // Generate time slots from 6 AM to 10 PM
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 6;
    return {
      hour,
      label: format(new Date().setHours(hour, 0), 'h a'),
      time24: `${String(hour).padStart(2, '0')}:00`
    };
  });

  // Helper to position todos on the timeline
  const getTimePosition = (time: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = (hours - 6) * 60 + minutes;
    const percentage = (totalMinutes / (17 * 60)) * 100;
    return Math.max(0, Math.min(100, percentage));
  };

  const getEventHeight = (duration: number) => {
    const heightPercentage = (duration / (17 * 60)) * 100;
    return Math.max(2, heightPercentage);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive';
      case 'high': return 'bg-accent';
      case 'medium': return 'bg-primary';
      case 'low': return 'bg-muted-foreground';
      default: return 'bg-primary';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {profile ? `${profile.first_name}'s Schedule` : 'Schedule'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-32 text-center">
              {format(parseISO(viewDate), 'EEE, MMM d, yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => navigateDay('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
        ) : (
          <>
            {/* Conflict Warning */}
            {todos.length > 3 && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-orange-700">
                  This user has {todos.length} tasks scheduled on this day. Consider a different date.
                </span>
              </div>
            )}

            {/* Timeline View */}
            <div className="relative border rounded-lg overflow-hidden" style={{ height: '400px' }}>
              {/* Time Labels */}
              <div className="absolute left-0 top-0 bottom-0 w-14 bg-muted/30 border-r">
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot.hour}
                    className="absolute text-xs text-muted-foreground px-2"
                    style={{ top: `${(index / 16) * 100}%` }}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>

              {/* Timeline Grid */}
              <div className="absolute left-14 right-0 top-0 bottom-0">
                {/* Hour Lines */}
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot.hour}
                    className="absolute left-0 right-0 border-t border-dashed border-muted"
                    style={{ top: `${(index / 16) * 100}%` }}
                  />
                ))}

                {/* Scheduled Todos */}
                {todos.map((todo) => {
                  const startPos = getTimePosition(todo.start_time || '09:00');
                  const duration = todo.duration || 30;
                  const height = getEventHeight(duration);

                  if (startPos === null) return null;

                  return (
                    <div
                      key={todo.id}
                      className={cn(
                        "absolute left-2 right-2 rounded px-2 py-1 text-white text-xs overflow-hidden",
                        getPriorityColor(todo.priority)
                      )}
                      style={{
                        top: `${startPos}%`,
                        height: `${height}%`,
                        minHeight: '24px'
                      }}
                      title={`${todo.title} (${duration} min)`}
                    >
                      <div className="font-medium truncate">{todo.title}</div>
                      <div className="opacity-80">
                        {todo.start_time && format(parseISO(`2000-01-01T${todo.start_time}`), 'h:mm a')}
                        {todo.due_time && ` - ${format(parseISO(`2000-01-01T${todo.due_time}`), 'h:mm a')}`}
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {todos.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No scheduled tasks for this day</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Task List Summary */}
            {todos.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium">Scheduled Tasks ({todos.length})</h4>
                <div className="grid gap-2">
                  {todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <div className={cn("w-2 h-2 rounded-full", getPriorityColor(todo.priority))} />
                      <span className="text-sm flex-1 truncate">{todo.title}</span>
                      {todo.start_time && (
                        <Badge variant="outline" className="text-xs">
                          {format(parseISO(`2000-01-01T${todo.start_time}`), 'h:mm a')}
                        </Badge>
                      )}
                      {todo.duration && (
                        <Badge variant="secondary" className="text-xs">
                          {todo.duration}m
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
