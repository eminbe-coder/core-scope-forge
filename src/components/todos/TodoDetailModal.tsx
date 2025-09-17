import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Clock, User, Save, Trash2, MessageSquare, Activity, ExternalLink, Timer, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DurationInput } from '@/components/ui/duration-input';
import { useWorkingHours } from '@/hooks/use-working-hours';
import { SubtaskManager } from './SubtaskManager';
import { MultiAssigneeManager } from './MultiAssigneeManager';
import { DynamicSearchableSelect } from '@/components/ui/dynamic-searchable-select';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
  start_time?: string;
  duration?: number;
  contact_id?: string;
  priority?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  created_by: string;
  type_id?: string;
  entity_type: string;
  entity_id: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  assigned_profile?: { first_name: string; last_name: string; id: string } | null;
  created_by_profile?: { first_name: string; last_name: string; id: string } | null;
  todo_types?: { name: string; color: string; icon: string } | null;
  contact?: { first_name: string; last_name: string; id: string } | null;
}

interface TodoDetailModalProps {
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  canEdit?: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  user_name?: string;
  notes?: string;
  created_at: string;
}

export const TodoDetailModal: React.FC<TodoDetailModalProps> = ({
  todo,
  isOpen,
  onClose,
  onUpdate,
  canEdit = true,
}) => {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const { calculateStartTime, workingHours } = useWorkingHours();
  const [editedTodo, setEditedTodo] = useState<Todo | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [todoTypes, setTodoTypes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [linkedEntity, setLinkedEntity] = useState<{ name: string; type: string } | null>(null);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (todo) {
      fetchCompleteToDoData();
      if (currentTenant?.id) {
        fetchProfiles();
        fetchTodoTypes();
        fetchContacts();
        fetchActivityLogs();
        fetchLinkedEntity();
        fetchAssignees();
      }
    }
  }, [todo, currentTenant?.id]);

  const fetchCompleteToDoData = async () => {
    if (!todo?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('todos')
        .select(`
          *,
          contact:contacts(id, first_name, last_name),
          assigned_profile:profiles!assigned_to(id, first_name, last_name),
          created_by_profile:profiles!created_by(id, first_name, last_name),
          todo_types(name, color, icon)
        `)
        .eq('id', todo.id)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setEditedTodo(data);
      }
    } catch (error) {
      console.error('Error fetching complete todo data:', error);
      setEditedTodo({ ...todo });
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');
      
      if (data) {
        setProfiles(data);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchTodoTypes = async () => {
    try {
      const { data } = await supabase
        .from('todo_types')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .eq('active', true)
        .order('name');
      
      if (data) {
        setTodoTypes(data);
      }
    } catch (error) {
      console.error('Error fetching todo types:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('tenant_id', currentTenant?.id)
        .order('first_name');
      
      if (data) {
        setContacts(data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchActivityLogs = async () => {
    if (!todo?.id) return;
    
    try {
      const { data } = await supabase
        .from('todo_audit_logs')
        .select('*')
        .eq('todo_id', todo.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        setActivityLogs(data);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const fetchAssignees = async () => {
    if (!todo?.id) return;

    try {
      const { data, error } = await supabase
        .from('todo_assignees')
        .select(`
          id,
          user_id,
          profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('todo_id', todo.id);

      if (error) throw error;
      setAssignees(data || []);
    } catch (error) {
      console.error('Error fetching assignees:', error);
    }
  };

  const fetchLinkedEntity = async () => {
    if (!todo?.entity_type || !todo?.entity_id) return;
    
    try {
      let query;
      let nameField = 'name';
      
      switch (todo.entity_type) {
        case 'deal':
          query = supabase.from('deals').select('name').eq('id', todo.entity_id).single();
          break;
        case 'project':
          query = supabase.from('projects').select('name').eq('id', todo.entity_id).single();
          break;
        case 'contact':
          query = supabase.from('contacts').select('first_name, last_name').eq('id', todo.entity_id).single();
          nameField = 'first_name';
          break;
        case 'company':
          query = supabase.from('companies').select('name').eq('id', todo.entity_id).single();
          break;
        case 'site':
          query = supabase.from('sites').select('name').eq('id', todo.entity_id).single();
          break;
        case 'contract':
          query = supabase.from('contracts').select('name').eq('id', todo.entity_id).single();
          break;
        default:
          return;
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching linked entity:', error);
        return;
      }
      
      if (data) {
        let entityName = '';
        if (todo.entity_type === 'contact') {
          entityName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
        } else {
          entityName = data[nameField] || 'Unknown';
        }
        
        setLinkedEntity({
          name: entityName,
          type: todo.entity_type
        });
      }
    } catch (error) {
      console.error('Error fetching linked entity:', error);
    }
  };

  // Auto-calculation functions and effects
  useEffect(() => {
    if (!editedTodo || isCalculating) return;

    const { start_time, due_time, duration, due_date } = editedTodo;
    if (!due_date) return;

    let shouldUpdate = false;
    let updatedTodo = { ...editedTodo };

    if (start_time && duration) {
      const startDateTime = new Date(`${due_date}T${start_time}`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
      const calculatedDueTime = endDateTime.toTimeString().slice(0, 5);
      
      if (calculatedDueTime && calculatedDueTime !== due_time) {
        updatedTodo.due_time = calculatedDueTime;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      setIsCalculating(true);
      setEditedTodo(updatedTodo);
      setTimeout(() => setIsCalculating(false), 100);
    }
  }, [editedTodo?.start_time, editedTodo?.due_time, editedTodo?.duration]);

  const handleSave = async () => {
    if (!editedTodo || !canEdit) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          title: editedTodo.title,
          description: editedTodo.description,
          due_date: editedTodo.due_date,
          due_time: editedTodo.due_time,
          start_time: editedTodo.start_time,
          duration: editedTodo.duration,
          contact_id: editedTodo.contact_id,
          priority: editedTodo.priority as 'high' | 'medium' | 'low' | 'urgent',
          status: editedTodo.status,
          assigned_to: editedTodo.assigned_to,
          type_id: editedTodo.type_id,
          notes: editedTodo.notes,
        })
        .eq('id', editedTodo.id);

      if (error) throw error;

      toast.success('Todo updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update todo');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteAndCreateNew = async () => {
    if (!editedTodo || !currentTenant?.id) return;

    setDuplicating(true);
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', editedTodo.id);

      if (error) throw error;

      toast.success('Todo completed successfully');
      onUpdate();
      onClose();
      
    } catch (error) {
      console.error('Error completing todo:', error);
      toast.error('Failed to complete todo');
    } finally {
      setDuplicating(false);
    }
  };

  if (!editedTodo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Todo Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="subtasks">Subtasks</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editedTodo.title}
                    onChange={(e) => setEditedTodo({ ...editedTodo, title: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editedTodo.due_date && "text-muted-foreground"
                        )}
                        disabled={!canEdit}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editedTodo.due_date ? format(new Date(editedTodo.due_date + 'T00:00:00'), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedTodo.due_date ? new Date(editedTodo.due_date + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setEditedTodo({ ...editedTodo, due_date: `${year}-${month}-${day}` });
                          }
                        }}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Contact</Label>
                  <DynamicSearchableSelect
                    value={editedTodo.contact_id || ''}
                    onValueChange={(value) => {
                      setEditedTodo(prev => prev ? { ...prev, contact_id: value || null } : null);
                    }}
                    placeholder="Search contacts..."
                    tableName="contacts"
                    searchFields={['first_name', 'last_name', 'email']}
                    displayFormat={(item) => `${item.first_name} ${item.last_name}`}
                    additionalFilters={{ tenant_id: currentTenant?.id }}
                    disabled={!canEdit}
                  />
                </div>

                {linkedEntity && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <span className="text-sm">
                      <strong>Linked to:</strong> {linkedEntity.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/${linkedEntity.type}s/${todo?.entity_id}`)}
                      className="ml-auto"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <MultiAssigneeManager
                  todoId={editedTodo.id}
                  assignees={assignees}
                  canEdit={canEdit}
                  onAssigneesChange={setAssignees}
                />
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saving || !editedTodo.title?.trim()}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCompleteAndCreateNew}
                  disabled={duplicating || editedTodo.status === 'completed'}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {duplicating ? 'Processing...' : 'Complete & Create New'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this todo?')) {
                      // Handle delete
                    }
                  }}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="subtasks">
            <SubtaskManager
              todoId={editedTodo.id!}
              canEdit={canEdit}
              onSubtaskChange={() => {
                fetchCompleteToDoData();
              }}
            />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {editedTodo.notes ? (
                  <div className="whitespace-pre-wrap bg-muted p-3 rounded-md text-sm">
                    {editedTodo.notes}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">No notes yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                {activityLogs.length > 0 ? (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="border-l-2 border-muted pl-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{log.user_name || 'System'}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {log.action.replace('_', ' ')}
                          {log.field_name && ` - ${log.field_name}`}
                        </div>
                        {log.notes && (
                          <div className="text-sm">{log.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">No activity yet</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};