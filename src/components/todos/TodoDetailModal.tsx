import { useState, useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Clock, User, Save, Trash2, MessageSquare, Activity, ExternalLink, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DurationInput } from '@/components/ui/duration-input';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  due_time?: string;
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
  const [editedTodo, setEditedTodo] = useState<Todo | null>(null);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [todoTypes, setTodoTypes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [linkedEntity, setLinkedEntity] = useState<{ name: string; type: string } | null>(null);

  useEffect(() => {
    if (todo) {
      // Fetch complete todo data with relationships
      fetchCompleteToDoData();
      if (currentTenant?.id) {
        fetchProfiles();
        fetchTodoTypes();
        fetchContacts();
        fetchActivityLogs();
        fetchLinkedEntity();
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
      // Fallback to the provided todo data
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
        case 'customer':
          query = supabase.from('customers').select('name').eq('id', todo.entity_id).single();
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

  const getEntityDisplayName = (type: string) => {
    const displayNames: { [key: string]: string } = {
      deal: 'Deal',
      project: 'Project', 
      customer: 'Customer',
      contact: 'Contact',
      company: 'Company',
      site: 'Site',
      contract: 'Contract'
    };
    return displayNames[type] || type;
  };

  const navigateToEntity = () => {
    if (!linkedEntity || !todo?.entity_id) {
      toast.error('Entity information not available');
      return;
    }
    
    // Routes that have detail pages
    const detailRoutes: { [key: string]: string } = {
      deal: `/deals/${todo.entity_id}`,
      customer: `/customers/${todo.entity_id}`,
      contact: `/contacts/${todo.entity_id}`,
      site: `/sites/${todo.entity_id}`,
      contract: `/contracts/${todo.entity_id}`
    };
    
    // Routes that only have list pages
    const fallbackRoutes: { [key: string]: string } = {
      project: '/projects', 
      company: '/companies'
    };
    
    const detailRoute = detailRoutes[linkedEntity.type];
    const fallbackRoute = fallbackRoutes[linkedEntity.type];
    
    if (detailRoute) {
      // Navigate to detail page
      navigate(detailRoute);
      onClose();
    } else if (fallbackRoute) {
      // Navigate to list page with a message
      navigate(fallbackRoute);
      onClose();
      toast.info(`Navigated to ${getEntityDisplayName(linkedEntity.type)} list page`);
    } else {
      toast.error('Navigation not available for this entity type');
    }
  };

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

  const handleDelete = async () => {
    if (!editedTodo || !canEdit) return;

    if (!confirm('Are you sure you want to delete this todo?')) return;

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', editedTodo.id);

      if (error) throw error;

      toast.success('Todo deleted successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete todo');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !editedTodo) return;

    setAddingNote(true);
    try {
      const currentNotes = editedTodo.notes || '';
      const timestamp = new Date().toISOString();
      const updatedNotes = currentNotes 
        ? `${currentNotes}\n\n[${format(new Date(timestamp), 'MMM dd, yyyy HH:mm')}] ${newNote}`
        : `[${format(new Date(timestamp), 'MMM dd, yyyy HH:mm')}] ${newNote}`;

      const { error } = await supabase
        .from('todos')
        .update({ notes: updatedNotes })
        .eq('id', editedTodo.id);

      if (error) throw error;

      setEditedTodo({ ...editedTodo, notes: updatedNotes });
      setNewNote('');
      toast.success('Note added successfully');
      
      // Refresh activity logs
      fetchActivityLogs();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editedTodo.description || ''}
                    onChange={(e) => setEditedTodo({ ...editedTodo, description: e.target.value })}
                    disabled={!canEdit}
                    rows={3}
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
                        {editedTodo.due_date ? format(new Date(editedTodo.due_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editedTodo.due_date ? new Date(editedTodo.due_date) : undefined}
                        onSelect={(date) => 
                          setEditedTodo({ 
                            ...editedTodo, 
                            due_date: date ? date.toISOString().split('T')[0] : undefined 
                          })
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Due Time</Label>
                  <Input
                    type="time"
                    value={editedTodo.due_time || ''}
                    onChange={(e) => setEditedTodo({ ...editedTodo, due_time: e.target.value || undefined })}
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <Label>Duration</Label>
                  {canEdit ? (
                    <DurationInput
                      value={editedTodo.duration || 10}
                      onChange={(minutes) => setEditedTodo({ ...editedTodo, duration: minutes })}
                    />
                  ) : (
                    <div className="p-2 bg-muted rounded-md text-sm">
                      {editedTodo.duration ? (
                        editedTodo.duration >= 1440 
                          ? `${Math.round(editedTodo.duration / 1440)} day${Math.round(editedTodo.duration / 1440) > 1 ? 's' : ''}`
                          : editedTodo.duration >= 60 
                          ? `${Math.round(editedTodo.duration / 60)} hour${Math.round(editedTodo.duration / 60) > 1 ? 's' : ''}`
                          : `${editedTodo.duration} minute${editedTodo.duration > 1 ? 's' : ''}`
                      ) : (
                        '10 minutes (default)'
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={editedTodo.status}
                    onValueChange={(value) => setEditedTodo({ ...editedTodo, status: value as any })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={editedTodo.priority || 'medium'}
                    onValueChange={(value) => setEditedTodo({ ...editedTodo, priority: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Assigned To</Label>
                  <Select
                    value={editedTodo.assigned_to || 'unassigned'}
                    onValueChange={(value) => setEditedTodo({ 
                      ...editedTodo, 
                      assigned_to: value === 'unassigned' ? undefined : value 
                    })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.first_name} {profile.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Type</Label>
                  <Select
                    value={editedTodo.type_id || 'none'}
                    onValueChange={(value) => setEditedTodo({ 
                      ...editedTodo, 
                      type_id: value === 'none' ? undefined : value 
                    })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No type</SelectItem>
                      {todoTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Contact</Label>
                  <Select
                    value={editedTodo.contact_id || 'none'}
                    onValueChange={(value) => setEditedTodo({ 
                      ...editedTodo, 
                      contact_id: value === 'none' ? undefined : value 
                    })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No contact</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {linkedEntity && (
                  <div>
                    <Label>Linked Entity</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={navigateToEntity}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Linked to: {getEntityDisplayName(linkedEntity.type)} – {linkedEntity.name}
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Info</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getStatusColor(editedTodo.status)}>
                      {editedTodo.status.replace('_', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(editedTodo.priority || 'medium')}>
                      {editedTodo.priority || 'medium'} priority
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Created: {format(new Date(editedTodo.created_at), 'PPP')}</div>
                    <div>Updated: {format(new Date(editedTodo.updated_at), 'PPP')}</div>
                    {editedTodo.completed_at && (
                      <div>Completed: {format(new Date(editedTodo.completed_at), 'PPP')}</div>
                    )}
                    {editedTodo.due_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due at: {editedTodo.due_time}
                      </div>
                    )}
                    {editedTodo.duration && (
                      <div className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        Duration: {editedTodo.duration >= 1440 
                          ? `${Math.round(editedTodo.duration / 1440)} day${Math.round(editedTodo.duration / 1440) > 1 ? 's' : ''}`
                          : editedTodo.duration >= 60 
                          ? `${Math.round(editedTodo.duration / 60)} hour${Math.round(editedTodo.duration / 60) > 1 ? 's' : ''}`
                          : `${editedTodo.duration} minute${editedTodo.duration > 1 ? 's' : ''}`
                        }
                      </div>
                    )}
                    {editedTodo.contact && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Contact: {editedTodo.contact.first_name} {editedTodo.contact.last_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-between">
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notes
                </CardTitle>
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

            {canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Note</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      rows={3}
                    />
                    <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                      {addingNote ? 'Adding...' : 'Add Note'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Log
                </CardTitle>
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