import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { 
  CalendarIcon, Clock, Save, Trash2, MessageSquare, ExternalLink, 
  Timer, Copy, CheckCircle, CalendarClock, MapPin, Calendar as CalendarDays,
  Plus, RefreshCw
} from 'lucide-react';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DurationInput } from '@/components/ui/duration-input';
import { useWorkingHours } from '@/hooks/use-working-hours';
import { SubtaskManagerEnhanced } from './SubtaskManagerEnhanced';
import { MultiAssigneeManager } from './MultiAssigneeManager';
import { PostponeDialog } from './PostponeDialog';
import { SiteSelect, ContactSelect } from '@/components/ui/entity-select';
import { ConflictCalendarView } from './ConflictCalendarView';

interface Todo {
  id?: string;
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
  created_by?: string;
  type_id?: string;
  payment_term_id?: string;
  entity_type: string;
  entity_id?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  location?: string;
  location_site_id?: string;
  google_calendar_sync?: boolean;
}

interface UnifiedTodoModalProps {
  todo?: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  canEdit?: boolean;
  // For creation mode
  entityType?: string;
  entityId?: string;
  paymentTermId?: string;
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

export const UnifiedTodoModal: React.FC<UnifiedTodoModalProps> = ({
  todo: initialTodo,
  isOpen,
  onClose,
  onUpdate,
  canEdit = true,
  entityType: defaultEntityType,
  entityId: defaultEntityId,
  paymentTermId: defaultPaymentTermId,
}) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { calculateStartTime, workingHours } = useWorkingHours();
  
  // Determine if creating new or editing existing
  const isCreating = !initialTodo?.id;
  
  // Form state
  const [editedTodo, setEditedTodo] = useState<Todo>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    duration: 10,
    entity_type: defaultEntityType || 'standalone',
    entity_id: defaultEntityId || null,
    payment_term_id: defaultPaymentTermId,
    google_calendar_sync: false,
    ...initialTodo,
  });
  
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [todoTypes, setTodoTypes] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [linkedEntity, setLinkedEntity] = useState<{ name: string; type: string } | null>(null);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Subtask aggregation for main task
  const [subtaskStats, setSubtaskStats] = useState({ totalDuration: 0, latestDeadline: '' });

  // Check if selected type is "Appointment"
  const selectedType = todoTypes.find(t => t.id === editedTodo.type_id);
  const isAppointmentType = selectedType?.name?.toLowerCase().includes('appointment') || 
                            selectedType?.name?.toLowerCase().includes('meeting');

  useEffect(() => {
    if (isOpen && currentTenant?.id) {
      fetchProfiles();
      fetchTodoTypes();
      
      if (!isCreating && initialTodo?.id) {
        fetchCompleteToDoData();
        fetchActivityLogs();
        fetchLinkedEntity();
        fetchAssignees();
      } else {
        // Reset for creation mode
        setEditedTodo({
          title: '',
          description: '',
          status: 'pending',
          priority: 'medium',
          duration: 10,
          entity_type: defaultEntityType || 'standalone',
          entity_id: defaultEntityId || null,
          payment_term_id: defaultPaymentTermId,
          assigned_to: user?.id,
          google_calendar_sync: false,
        });
      }
    }
  }, [isOpen, currentTenant?.id, initialTodo?.id]);

  const fetchCompleteToDoData = async () => {
    if (!initialTodo?.id) return;
    
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
        .eq('id', initialTodo.id)
        .single();
      
      if (error) throw error;
      if (data) {
        setEditedTodo(data);
      }
    } catch (error) {
      console.error('Error fetching complete todo data:', error);
    }
  };

  const fetchProfiles = async () => {
    if (!currentTenant?.id) return;
    
    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('user_tenant_memberships')
        .select('user_id')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      if (membershipError) throw membershipError;
      const userIds = memberships?.map(m => m.user_id) || [];
      
      if (userIds.length === 0) {
        setProfiles([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds)
        .order('first_name');
      
      if (error) throw error;
      setProfiles(data || []);
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
        .order('sort_order');
      
      if (data) setTodoTypes(data);
    } catch (error) {
      console.error('Error fetching todo types:', error);
    }
  };

  const fetchActivityLogs = async () => {
    if (!initialTodo?.id) return;
    
    try {
      const { data } = await supabase
        .from('todo_audit_logs')
        .select('*')
        .eq('todo_id', initialTodo.id)
        .order('created_at', { ascending: false });
      
      if (data) setActivityLogs(data);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const fetchAssignees = async () => {
    if (!initialTodo?.id) return;

    try {
      const { data, error } = await supabase
        .from('todo_assignees')
        .select(`
          id,
          user_id,
          profiles!todo_assignees_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('todo_id', initialTodo.id);

      if (error) {
        console.error('Error fetching assignees:', error);
        setAssignees([]);
        return;
      }

      setAssignees((data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        profiles: item.profiles
      })));
    } catch (error) {
      console.error('Error fetching assignees:', error);
    }
  };

  const fetchLinkedEntity = async () => {
    if (!initialTodo?.entity_type || !initialTodo?.entity_id) return;
    
    try {
      let query;
      switch (initialTodo.entity_type) {
        case 'deal':
          query = supabase.from('deals').select('name').eq('id', initialTodo.entity_id).single();
          break;
        case 'project':
          query = supabase.from('projects').select('name').eq('id', initialTodo.entity_id).single();
          break;
        case 'contact':
          query = supabase.from('contacts').select('first_name, last_name').eq('id', initialTodo.entity_id).single();
          break;
        case 'company':
          query = supabase.from('companies').select('name').eq('id', initialTodo.entity_id).single();
          break;
        case 'site':
          query = supabase.from('sites').select('name').eq('id', initialTodo.entity_id).single();
          break;
        case 'contract':
          query = supabase.from('contracts').select('name').eq('id', initialTodo.entity_id).single();
          break;
        default:
          return;
      }
      
      const { data, error } = await query;
      if (error) return;
      
      if (data) {
        let entityName = initialTodo.entity_type === 'contact'
          ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
          : data.name || 'Unknown';
        
        setLinkedEntity({ name: entityName, type: initialTodo.entity_type });
      }
    } catch (error) {
      console.error('Error fetching linked entity:', error);
    }
  };

  // Handle subtask stats update from SubtaskManagerEnhanced
  const handleSubtaskStatsUpdate = (stats: { totalDuration: number; latestDeadline: string }) => {
    setSubtaskStats(stats);
    
    // Auto-sync main task duration and deadline
    if (stats.totalDuration > 0 && stats.totalDuration !== editedTodo.duration) {
      setEditedTodo(prev => ({ ...prev, duration: stats.totalDuration }));
    }
    
    if (stats.latestDeadline && stats.latestDeadline !== editedTodo.due_date) {
      setEditedTodo(prev => ({ ...prev, due_date: stats.latestDeadline }));
    }
  };

  const handleSave = async () => {
    if (!canEdit || !currentTenant?.id) return;

    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('User not authenticated');

      // Get default todo type if none selected
      let typeId = editedTodo.type_id;
      if (!typeId && todoTypes.length > 0) {
        const defaultType = todoTypes.find(t => t.name === 'General Task') || todoTypes[0];
        typeId = defaultType.id;
      }

      // Sanitize fields
      const sanitizedEntityId = editedTodo.entity_type === 'standalone' || !editedTodo.entity_id 
        ? null : editedTodo.entity_id;
      const sanitizedAssignedTo = !editedTodo.assigned_to || editedTodo.assigned_to === 'unassigned' 
        ? authUser.id : editedTodo.assigned_to;
      const sanitizedContactId = !editedTodo.contact_id || editedTodo.contact_id === 'none' 
        ? null : editedTodo.contact_id;
      const sanitizedPaymentTermId = !editedTodo.payment_term_id || editedTodo.payment_term_id === 'none'
        ? null : editedTodo.payment_term_id;
      const sanitizedLocationSiteId = !editedTodo.location_site_id || editedTodo.location_site_id === 'none'
        ? null : editedTodo.location_site_id;
      
      // Cast priority to the correct type
      const validPriority = (editedTodo.priority || 'medium') as 'high' | 'medium' | 'low' | 'urgent';

      const todoData = {
        title: editedTodo.title,
        description: editedTodo.description || null,
        due_date: editedTodo.due_date || null,
        due_time: editedTodo.due_time || null,
        start_time: editedTodo.start_time || null,
        duration: editedTodo.duration || 10,
        contact_id: sanitizedContactId,
        priority: validPriority,
        status: editedTodo.status,
        assigned_to: sanitizedAssignedTo,
        type_id: typeId,
        notes: editedTodo.notes || null,
        location: editedTodo.location || null,
        location_site_id: sanitizedLocationSiteId,
        google_calendar_sync: editedTodo.google_calendar_sync || false,
      };

      let savedTodoId = editedTodo.id;

      if (isCreating) {
        // Create new todo
        const { data: newTodo, error } = await supabase
          .from('todos')
          .insert({
            ...todoData,
            tenant_id: currentTenant.id,
            entity_type: editedTodo.entity_type || 'standalone',
            entity_id: sanitizedEntityId,
            payment_term_id: sanitizedPaymentTermId,
            created_by: authUser.id,
          })
          .select()
          .single();

        if (error) throw error;
        
        toast.success('To-Do created successfully');
        savedTodoId = newTodo?.id;
        
        // Switch to editing mode with the new todo
        if (newTodo) {
          setEditedTodo(newTodo);
          setActiveTab('subtasks'); // Auto-switch to subtasks tab
        }
      } else {
        // Update existing todo
        const { error } = await supabase
          .from('todos')
          .update(todoData)
          .eq('id', editedTodo.id);

        if (error) throw error;
        toast.success('To-Do updated successfully');
      }

      // If Google sync is enabled, trigger the sync (Calendar for Appointments, Tasks for To-Dos)
      if (editedTodo.google_calendar_sync && savedTodoId) {
        await syncToGoogle(savedTodoId, todoData);
      }

      onUpdate?.();
    } catch (error) {
      console.error('Error saving todo:', error);
      toast.error('Failed to save to-do');
    } finally {
      setSaving(false);
    }
  };

  // Function to sync todo to Google (Calendar for Appointments, Tasks for To-Dos)
  const syncToGoogle = async (todoId: string, todoData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Please log in to sync with Google');
        return;
      }

      // Get location from site if site is selected
      let locationText = todoData.location;
      if (todoData.location_site_id && !locationText) {
        const { data: site } = await supabase
          .from('sites')
          .select('name, address')
          .eq('id', todoData.location_site_id)
          .single();
        
        if (site) {
          locationText = site.address || site.name;
        }
      }

      // Get the type name to determine Calendar vs Tasks sync
      const typeName = selectedType?.name || '';
      const isAppointment = isAppointmentType;

      const response = await supabase.functions.invoke('sync-to-google', {
        body: {
          todo_id: todoId,
          title: todoData.title,
          description: todoData.description,
          due_date: todoData.due_date,
          due_time: todoData.due_time,
          start_time: todoData.start_time,
          duration: todoData.duration,
          location: locationText,
          entity_type: editedTodo.entity_type,
          is_appointment: isAppointment,
          type_name: typeName,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        console.error('Google sync error:', response.error);
        toast.error('Failed to sync with Google');
      } else if (response.data?.code === 'GOOGLE_NOT_CONNECTED') {
        toast.error('Please connect your Google account in Settings > Security');
      } else {
        const syncType = response.data?.sync_type === 'calendar' ? 'Google Calendar' : 'Google Tasks';
        toast.success(`Synced to ${syncType}`);
      }
    } catch (error) {
      console.error('Error syncing to Google:', error);
      // Don't show error toast here as it's a secondary action
    }
  };

  const handleMarkComplete = async () => {
    if (!editedTodo.id) return;

    setSaving(true);
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

      toast.success('To-Do marked as completed');
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error completing todo:', error);
      toast.error('Failed to complete to-do');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editedTodo.id || !currentTenant?.id) return;

    if (!confirm('Are you sure you want to delete this to-do?')) return;

    setDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_entity', {
        _table_name: 'todos',
        _entity_id: editedTodo.id,
        _tenant_id: currentTenant.id
      });

      if (error) throw error;

      toast.success('To-Do moved to recycle bin');
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete to-do');
    } finally {
      setDeleting(false);
    }
  };

  const handlePostpone = async (newDate: string, newTime: string, reason: string) => {
    if (!editedTodo.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          due_date: newDate,
          due_time: newTime || null,
          notes: editedTodo.notes 
            ? `${editedTodo.notes}\n\n[${new Date().toLocaleString()}] Postponed: ${reason}` 
            : `[${new Date().toLocaleString()}] Postponed: ${reason}`
        })
        .eq('id', editedTodo.id);

      if (error) throw error;

      toast.success('To-Do postponed successfully');
      setPostponeDialogOpen(false);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error postponing todo:', error);
      toast.error('Failed to postpone to-do');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {isCreating ? 'Create To-Do' : 'To-Do Details'}
            </DialogTitle>
            <DialogDescription>
              {isCreating 
                ? 'Create a new task with subtasks, notes, and scheduling'
                : `Editing: ${editedTodo.title || 'Untitled'}`
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="subtasks" disabled={isCreating && !editedTodo.id}>
                Subtasks
              </TabsTrigger>
              <TabsTrigger value="schedule" disabled={isCreating && !editedTodo.id}>
                Schedule
              </TabsTrigger>
              <TabsTrigger value="notes" disabled={isCreating && !editedTodo.id}>
                Notes
              </TabsTrigger>
              <TabsTrigger value="activity" disabled={isCreating}>
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Core Details */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={editedTodo.title}
                      onChange={(e) => setEditedTodo(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter task title"
                      disabled={!canEdit}
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editedTodo.description || ''}
                      onChange={(e) => setEditedTodo(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter task description"
                      rows={3}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Priority</Label>
                      <Select
                        value={editedTodo.priority || 'medium'}
                        onValueChange={(value) => setEditedTodo(prev => ({ ...prev, priority: value }))}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Type</Label>
                      <Select
                        value={editedTodo.type_id || ''}
                        onValueChange={(value) => setEditedTodo(prev => ({ ...prev, type_id: value }))}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {todoTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: type.color }}
                                />
                                {type.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Assigned To</Label>
                    <Select
                      value={editedTodo.assigned_to || 'unassigned'}
                      onValueChange={(value) => setEditedTodo(prev => ({ ...prev, assigned_to: value }))}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
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
                    <Label>Related Contact</Label>
                    <ContactSelect
                      value={editedTodo.contact_id || ''}
                      onValueChange={(value) => setEditedTodo(prev => ({ ...prev, contact_id: value || null }))}
                      placeholder="Select contact"
                      showQuickAdd={canEdit}
                      disabled={!canEdit}
                    />
                  </div>

                  {linkedEntity && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <span className="text-sm">
                        <strong>Linked to:</strong> {linkedEntity.name}
                        <Badge variant="outline" className="ml-2">{linkedEntity.type}</Badge>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/${linkedEntity.type}s/${editedTodo.entity_id}`)}
                        className="ml-auto"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right Column - Scheduling & Location */}
                <div className="space-y-4">
                  <div>
                    <Label>Duration</Label>
                    <DurationInput
                      value={editedTodo.duration || 10}
                      onChange={(minutes) => setEditedTodo(prev => ({ ...prev, duration: minutes }))}
                    />
                    {subtaskStats.totalDuration > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Timer className="h-3 w-3 inline mr-1" />
                        Calculated from subtasks: {subtaskStats.totalDuration} minutes
                      </p>
                    )}
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
                          {editedTodo.due_date 
                            ? format(new Date(editedTodo.due_date + 'T00:00:00'), "PPP") 
                            : "Pick a date"
                          }
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
                              setEditedTodo(prev => ({ ...prev, due_date: `${year}-${month}-${day}` }));
                            }
                          }}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {subtaskStats.latestDeadline && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <CalendarDays className="h-3 w-3 inline mr-1" />
                        Latest subtask deadline: {subtaskStats.latestDeadline}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={editedTodo.start_time || ''}
                        onChange={(e) => setEditedTodo(prev => ({ ...prev, start_time: e.target.value }))}
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label>Due Time</Label>
                      <Input
                        type="time"
                        value={editedTodo.due_time || ''}
                        onChange={(e) => setEditedTodo(prev => ({ ...prev, due_time: e.target.value }))}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  {/* Appointment Location Section */}
                  {isAppointmentType && (
                    <Card className="border-primary/20">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label>Manual Location / Google Maps URL</Label>
                          <Input
                            value={editedTodo.location || ''}
                            onChange={(e) => setEditedTodo(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="Enter address or paste Google Maps link"
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <Label>Or Select from Sites</Label>
                          <SiteSelect
                            value={editedTodo.location_site_id || ''}
                            onValueChange={(value) => setEditedTodo(prev => ({ ...prev, location_site_id: value || null }))}
                            placeholder="Select a site"
                            showQuickAdd={false}
                            disabled={!canEdit}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Google Calendar Sync Toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <div>
                        <Label className="cursor-pointer">Sync to Google Calendar</Label>
                        <p className="text-xs text-muted-foreground">
                          Prepare for calendar integration
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={editedTodo.google_calendar_sync || false}
                      onCheckedChange={(checked) => setEditedTodo(prev => ({ ...prev, google_calendar_sync: checked }))}
                      disabled={!canEdit}
                    />
                  </div>

                  {/* Multi-assignee manager for existing todos */}
                  {!isCreating && editedTodo.id && (
                    <MultiAssigneeManager
                      todoId={editedTodo.id}
                      assignees={assignees}
                      canEdit={canEdit}
                      onAssigneesChange={setAssignees}
                    />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {canEdit && (
                <div className="flex gap-2 pt-4 border-t flex-wrap">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !editedTodo.title?.trim()}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : isCreating ? 'Create & Add Subtasks' : 'Save Changes'}
                  </Button>
                  
                  {!isCreating && (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleMarkComplete}
                        disabled={saving || editedTodo.status === 'completed'}
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setPostponeDialogOpen(true)}
                        disabled={saving || editedTodo.status === 'completed'}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                      >
                        <CalendarClock className="h-4 w-4 mr-2" />
                        Postpone
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="subtasks" className="mt-4">
              {editedTodo.id ? (
                <SubtaskManagerEnhanced
                  todoId={editedTodo.id}
                  canEdit={canEdit}
                  onSubtaskChange={() => onUpdate?.()}
                  onStatsUpdate={handleSubtaskStatsUpdate}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Save the to-do first to add subtasks</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="mt-4">
              {editedTodo.id && editedTodo.assigned_to && editedTodo.due_date ? (
                <ConflictCalendarView
                  userId={editedTodo.assigned_to}
                  selectedDate={editedTodo.due_date}
                  currentTodoId={editedTodo.id}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select an assignee and due date to see their schedule</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedTodo.notes || ''}
                    onChange={(e) => setEditedTodo(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add notes, updates, or comments..."
                    rows={8}
                    disabled={!canEdit}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {activityLogs.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="border-l-2 border-muted pl-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{log.user_name || 'System'}</span>
                            <span className="text-muted-foreground">
                              {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.action.replace(/_/g, ' ')}
                            {log.field_name && ` - ${log.field_name}`}
                          </div>
                          {log.notes && (
                            <div className="text-sm mt-1">{log.notes}</div>
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

      {/* Postpone Dialog */}
      <PostponeDialog
        open={postponeDialogOpen}
        onOpenChange={setPostponeDialogOpen}
        onConfirm={handlePostpone}
        currentDate={editedTodo.due_date}
        currentTime={editedTodo.due_time}
        loading={saving}
      />
    </>
  );
};
