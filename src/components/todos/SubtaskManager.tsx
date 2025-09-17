import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, CheckCircle, Circle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';

interface Subtask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
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

interface SubtaskManagerProps {
  todoId: string;
  canEdit: boolean;
  onSubtaskChange?: () => void;
}

export const SubtaskManager: React.FC<SubtaskManagerProps> = ({
  todoId,
  canEdit,
  onSubtaskChange
}) => {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const
  });
  const [loading, setLoading] = useState(false);
  const { currentTenant } = useTenant();

  useEffect(() => {
    if (todoId) {
      fetchSubtasks();
    }
  }, [todoId]);

  const fetchSubtasks = async () => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          assigned_to,
          created_at,
          todo_assignees (
            id,
            user_id,
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('parent_todo_id', todoId)
        .eq('tenant_id', currentTenant?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setSubtasks(data || []);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
      toast({
        title: "Error",
        description: "Failed to load subtasks",
        variant: "destructive",
      });
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

      setNewSubtask({ title: '', description: '', priority: 'medium' });
      setIsAddingSubtask(false);
      fetchSubtasks();
      onSubtaskChange?.();

      toast({
        title: "Success",
        description: "Subtask created successfully",
      });
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast({
        title: "Error",
        description: "Failed to create subtask",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to update subtask",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!canEdit) return;

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;

      fetchSubtasks();
      onSubtaskChange?.();

      toast({
        title: "Success",
        description: "Subtask deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast({
        title: "Error",
        description: "Failed to delete subtask",
        variant: "destructive",
      });
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
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Subtasks ({subtasks.length})</h4>
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

      {isAddingSubtask && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input
              placeholder="Subtask title"
              value={newSubtask.title}
              onChange={(e) => setNewSubtask(prev => ({ ...prev, title: e.target.value }))}
            />
            <Textarea
              placeholder="Description (optional)"
              value={newSubtask.description}
              onChange={(e) => setNewSubtask(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
            <div className="flex items-center justify-between">
              <select
                value={newSubtask.priority}
                onChange={(e) => setNewSubtask(prev => ({ ...prev, priority: e.target.value as any }))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingSubtask(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateSubtask}
                  disabled={loading || !newSubtask.title.trim()}
                >
                  Create
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {subtasks.length > 0 && (
        <div className="space-y-2">
          {subtasks.map((subtask, index) => (
            <Card key={subtask.id} className="border-l-4 border-l-blue-200">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => handleToggleSubtask(subtask.id, subtask.status)}
                      disabled={!canEdit}
                      className="mt-0.5"
                    >
                      {getStatusIcon(subtask.status)}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${subtask.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                          {subtask.title}
                        </span>
                        <Badge variant={getPriorityColor(subtask.priority)} className="text-xs">
                          {subtask.priority}
                        </Badge>
                      </div>
                      {subtask.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {subtask.description}
                        </p>
                      )}
                      {subtask.assignees && subtask.assignees.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-muted-foreground">Assigned to:</span>
                          {subtask.assignees.map((assignee) => (
                            <Badge key={assignee.id} variant="secondary" className="text-xs">
                              {assignee.profiles.first_name} {assignee.profiles.last_name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {subtasks.length === 0 && !isAddingSubtask && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No subtasks yet
        </div>
      )}
    </div>
  );
};