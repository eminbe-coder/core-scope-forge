import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle, Circle, Clock, Timer, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenant } from '@/hooks/use-tenant';
import { DurationInput } from '@/components/ui/duration-input';

interface Subtask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  due_date?: string;
  due_time?: string;
  duration?: number;
  created_at: string;
  assignees?: Array<{
    id: string;
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  }>;
}

interface SubtaskManagerEnhancedProps {
  todoId: string;
  canEdit: boolean;
  onSubtaskChange?: () => void;
  onStatsUpdate?: (stats: { totalDuration: number; latestDeadline: string }) => void;
}

export const SubtaskManagerEnhanced: React.FC<SubtaskManagerEnhancedProps> = ({
  todoId,
  canEdit,
  onSubtaskChange,
  onStatsUpdate
}) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    due_date: '',
    due_time: '',
    duration: 15
  });
  const [loading, setLoading] = useState(false);
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (todoId) {
      fetchSubtasks();
    }
  }, [todoId]);

  // Calculate and emit stats whenever subtasks change
  useEffect(() => {
    if (onStatsUpdate && subtasks.length > 0) {
      const totalDuration = subtasks.reduce((sum, s) => sum + (s.duration || 0), 0);
      
      const deadlines = subtasks
        .filter(s => s.due_date)
        .map(s => s.due_date!)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      const latestDeadline = deadlines[0] || '';
      
      onStatsUpdate({ totalDuration, latestDeadline });
    }
  }, [subtasks, onStatsUpdate]);

  const fetchSubtasks = async () => {
    if (!todoId || !currentTenant?.id) return;
    
    try {
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('todos')
        .select('*')
        .eq('parent_todo_id', todoId)
        .eq('tenant_id', currentTenant.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (subtasksError) {
        console.error('Error fetching subtasks:', subtasksError);
        setSubtasks([]);
        return;
      }

      // Fetch assignees for each subtask
      const subtasksWithAssignees = await Promise.all(
        (subtasksData || []).map(async (subtask) => {
          const { data: assigneesData } = await supabase
            .from('todo_assignees')
            .select(`
              id,
              user_id,
              profiles!todo_assignees_user_id_fkey (
                first_name,
                last_name
              )
            `)
            .eq('todo_id', subtask.id);

          return {
            ...subtask,
            assignees: assigneesData || []
          } as Subtask;
        })
      );

      setSubtasks(subtasksWithAssignees);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
      setSubtasks([]);
    }
  };

  const handleCreateSubtask = async () => {
    if (!newSubtask.title.trim() || !currentTenant?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert({
          title: newSubtask.title,
          description: newSubtask.description || null,
          priority: newSubtask.priority,
          due_date: newSubtask.due_date || null,
          due_time: newSubtask.due_time || null,
          duration: newSubtask.duration || 15,
          status: 'pending',
          entity_type: 'todo',
          entity_id: todoId,
          parent_todo_id: todoId,
          tenant_id: currentTenant.id,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setNewSubtask({ title: '', description: '', priority: 'medium', due_date: '', due_time: '', duration: 15 });
      setIsAddingSubtask(false);
      fetchSubtasks();
      onSubtaskChange?.();

      toast.success('Subtask created');
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast.error('Failed to create subtask');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
    if (!canEdit) return;

    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
          completed_by: newStatus === 'completed' ? (await supabase.auth.getUser()).data.user?.id : null
        })
        .eq('id', subtaskId);

      if (error) throw error;

      fetchSubtasks();
      onSubtaskChange?.();
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const handleUpdateSubtask = async (subtaskId: string, updates: Partial<Subtask>) => {
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', subtaskId);

      if (error) throw error;

      fetchSubtasks();
      onSubtaskChange?.();
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!canEdit || !currentTenant?.id) return;

    try {
      const { error } = await supabase.rpc('soft_delete_entity', {
        _table_name: 'todos',
        _entity_id: subtaskId,
        _tenant_id: currentTenant.id
      });

      if (error) throw error;

      fetchSubtasks();
      onSubtaskChange?.();
      toast.success('Subtask removed');
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask');
    }
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
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 1440) return `${Math.round(minutes / 1440)}d`;
    if (minutes >= 60) return `${Math.round(minutes / 60)}h`;
    return `${minutes}m`;
  };

  // Calculate totals
  const totalDuration = subtasks.reduce((sum, s) => sum + (s.duration || 0), 0);
  const completedCount = subtasks.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            Subtasks: {completedCount}/{subtasks.length}
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Timer className="h-4 w-4" />
            Total: {formatDuration(totalDuration)}
          </span>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingSubtask(true)}
            disabled={isAddingSubtask}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Subtask
          </Button>
        )}
      </div>

      {/* Add Subtask Form */}
      {isAddingSubtask && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 space-y-4">
            <Input
              placeholder="Subtask title *"
              value={newSubtask.title}
              onChange={(e) => setNewSubtask(prev => ({ ...prev, title: e.target.value }))}
              autoFocus
            />
            
            <Textarea
              placeholder="Description (optional)"
              value={newSubtask.description}
              onChange={(e) => setNewSubtask(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Due Date</label>
                <Input
                  type="date"
                  value={newSubtask.due_date}
                  onChange={(e) => setNewSubtask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Due Time</label>
                <Input
                  type="time"
                  value={newSubtask.due_time}
                  onChange={(e) => setNewSubtask(prev => ({ ...prev, due_time: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Duration</label>
                <DurationInput
                  value={newSubtask.duration}
                  onChange={(minutes) => setNewSubtask(prev => ({ ...prev, duration: minutes }))}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Select
                value={newSubtask.priority}
                onValueChange={(value: any) => setNewSubtask(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingSubtask(false);
                    setNewSubtask({ title: '', description: '', priority: 'medium', due_date: '', due_time: '', duration: 15 });
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateSubtask}
                  disabled={loading || !newSubtask.title.trim()}
                >
                  {loading ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subtasks List */}
      {subtasks.length > 0 ? (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <Card key={subtask.id} className={cn(
              "border-l-4 transition-all",
              subtask.status === 'completed' ? 'border-l-green-400 bg-green-50/30' : 'border-l-blue-200'
            )}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  {/* Drag Handle (placeholder for future) */}
                  <GripVertical className="h-5 w-5 text-muted-foreground/50 mt-0.5 cursor-move" />
                  
                  {/* Status Toggle */}
                  <button
                    onClick={() => handleToggleSubtask(subtask.id, subtask.status)}
                    disabled={!canEdit}
                    className="mt-0.5 hover:scale-110 transition-transform"
                  >
                    {getStatusIcon(subtask.status)}
                  </button>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-medium",
                        subtask.status === 'completed' && 'line-through text-muted-foreground'
                      )}>
                        {subtask.title}
                      </span>
                      <Badge variant={getPriorityColor(subtask.priority)} className="text-xs">
                        {subtask.priority}
                      </Badge>
                      {subtask.duration && (
                        <Badge variant="outline" className="text-xs">
                          <Timer className="h-3 w-3 mr-1" />
                          {formatDuration(subtask.duration)}
                        </Badge>
                      )}
                    </div>
                    
                    {subtask.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {subtask.description}
                      </p>
                    )}
                    
                    {(subtask.due_date || subtask.due_time) && (
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {subtask.due_date && new Date(subtask.due_date).toLocaleDateString()}
                          {subtask.due_time && ` at ${subtask.due_time}`}
                        </span>
                      </div>
                    )}
                    
                    {subtask.assignees && subtask.assignees.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs text-muted-foreground">Assigned:</span>
                        {subtask.assignees.map((assignee) => (
                          <Badge key={assignee.id} variant="secondary" className="text-xs">
                            {assignee.profiles.first_name} {assignee.profiles.last_name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isAddingSubtask && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No subtasks yet</p>
          {canEdit && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsAddingSubtask(true)}
              className="mt-2"
            >
              Add your first subtask
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
