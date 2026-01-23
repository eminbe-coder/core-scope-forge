import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { DurationInput } from '@/components/ui/duration-input';
import { useWorkingHours } from '@/hooks/use-working-hours';

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  start_time: z.string().optional(),
  duration: z.number().min(1).optional().default(10),
  priority: z.string().optional().default('medium'),
  type_id: z.string().optional(),
  payment_term_id: z.string().optional(),
  contact_id: z.string().optional(),
});

interface TodoFormProps {
  entityType: string;
  entityId: string;
  paymentTermId?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export const TodoForm = ({ 
  entityType, 
  entityId, 
  paymentTermId,
  onSuccess,
  trigger,
  defaultOpen = false 
}: TodoFormProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { calculateStartTime, workingHours } = useWorkingHours();
  const [open, setOpen] = useState(defaultOpen);
  const [todoTypes, setTodoTypes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastChangedField, setLastChangedField] = useState<'start_time' | 'due_time' | 'duration' | null>(null);

  React.useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const form = useForm({
    resolver: zodResolver(todoSchema),
    defaultValues: {
        title: '',
        description: '',
        assigned_to: user?.id || 'unassigned',
        due_date: '',
        due_time: '',
        start_time: '',
        duration: 10,
        priority: 'medium',
        type_id: '',
        payment_term_id: paymentTermId || 'none',
        contact_id: 'none',
    },
  });

  useEffect(() => {
    if (open && currentTenant?.id) {
      fetchFormData();
      // Reset form with current user as default when opening
      form.reset({
        title: '',
        description: '',
        assigned_to: user?.id || 'unassigned',
        due_date: '',
        due_time: '',
        start_time: '',
        duration: 10,
        priority: 'medium',
        type_id: '',
        payment_term_id: paymentTermId || 'none',
        contact_id: 'none',
      });
    }
  }, [open, currentTenant?.id, entityType, entityId, user?.id]);

  const fetchFormData = async () => {
    try {
      const [todoTypesRes, profilesRes, contactsRes, paymentTermsRes] = await Promise.all([
        supabase
          .from('todo_types')
          .select('*')
          .eq('tenant_id', currentTenant?.id)
          .eq('active', true)
          .order('sort_order'),
        
        supabase.from('user_tenant_memberships').select(`
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `).eq('tenant_id', currentTenant?.id).eq('active', true),

        supabase
          .from('contacts')
          .select('id, first_name, last_name, email')
          .eq('tenant_id', currentTenant?.id)
          .eq('active', true)
          .order('first_name'),

        // Conditionally fetch payment terms for contracts
        ...(entityType === 'contract' ? [
          supabase
            .from('contract_payment_terms')
            .select('*')
            .eq('contract_id', entityId)
            .order('installment_number')
        ] : [])
      ]);

      if (todoTypesRes.error) throw todoTypesRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (contactsRes.error) throw contactsRes.error;

      setTodoTypes(todoTypesRes.data || []);
      setProfiles((profilesRes.data || []).map((membership: any) => membership.profiles).filter(Boolean));
      setContacts(contactsRes.data || []);
      
      if (entityType === 'contract' && paymentTermsRes && !paymentTermsRes.error) {
        setPaymentTerms(paymentTermsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
      toast.error('Failed to load form data');
    }
  };

  // Auto-calculation functions
  const calculateDueTime = (startTime: string, durationMinutes: number, date: string): string => {
    if (!startTime || !durationMinutes || !date) return '';
    
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
    
    return endDateTime.toTimeString().slice(0, 5); // HH:MM format
  };

  const calculateStartTimeFromDue = (dueTime: string, durationMinutes: number, date: string): string => {
    if (!dueTime || !durationMinutes || !date) return '';
    
    const dueDateTime = new Date(`${date}T${dueTime}`);
    if (workingHours) {
      const startDateTime = calculateStartTime(dueDateTime, durationMinutes);
      return startDateTime.toTimeString().slice(0, 5); // HH:MM format
    } else {
      // Fallback: simple subtraction
      const startDateTime = new Date(dueDateTime.getTime() - durationMinutes * 60 * 1000);
      return startDateTime.toTimeString().slice(0, 5);
    }
  };

  const calculateDurationFromTimes = (startTime: string, dueTime: string): number => {
    if (!startTime || !dueTime) return 10;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const due = new Date(`2000-01-01T${dueTime}`);
    const diffMs = due.getTime() - start.getTime();
    
    return Math.max(5, Math.round(diffMs / (1000 * 60))); // Minimum 5 minutes
  };

  // Watch for changes and auto-calculate
  const watchedValues = form.watch();
  
  // Track field changes
  const prevValuesRef = React.useRef(watchedValues);
  
  React.useEffect(() => {
    const { start_time, due_time, duration, due_date } = watchedValues;
    const prevValues = prevValuesRef.current;
    
    // Only auto-calculate if we have a date
    if (!due_date) return;
    
    // Determine which field changed
    let changedField: 'start_time' | 'due_time' | 'duration' | null = null;
    if (start_time !== prevValues.start_time) changedField = 'start_time';
    else if (due_time !== prevValues.due_time) changedField = 'due_time';
    else if (duration !== prevValues.duration) changedField = 'duration';
    
    if (changedField) {
      setLastChangedField(changedField);
    }
    
    // Update previous values
    prevValuesRef.current = watchedValues;
    
    // Debounce calculations
    const timeoutId = setTimeout(() => {
      // Priority-based calculations
      if (changedField === 'duration' || changedField === 'due_time') {
        // When duration or due_time changes, recalculate start_time
        if (due_time && duration) {
          const calculatedStartTime = calculateStartTimeFromDue(due_time, duration, due_date);
          if (calculatedStartTime !== start_time) {
            form.setValue('start_time', calculatedStartTime, { shouldValidate: false });
          }
        }
      } else if (changedField === 'start_time') {
        // When start_time changes, recalculate due_time
        if (start_time && duration) {
          const calculatedDueTime = calculateDueTime(start_time, duration, due_date);
          if (calculatedDueTime !== due_time) {
            form.setValue('due_time', calculatedDueTime, { shouldValidate: false });
          }
        }
      } else {
        // Initial calculations when no specific field changed
        if (start_time && duration && !due_time) {
          const calculatedDueTime = calculateDueTime(start_time, duration, due_date);
          form.setValue('due_time', calculatedDueTime, { shouldValidate: false });
        } else if (due_time && duration && !start_time) {
          const calculatedStartTime = calculateStartTimeFromDue(due_time, duration, due_date);
          form.setValue('start_time', calculatedStartTime, { shouldValidate: false });
        } else if (start_time && due_time && (!duration || duration === 10)) {
          const calculatedDuration = calculateDurationFromTimes(start_time, due_time);
          if (calculatedDuration !== duration) {
            form.setValue('duration', calculatedDuration, { shouldValidate: false });
          }
        }
      }
    }, 100); // 100ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [watchedValues.start_time, watchedValues.due_time, watchedValues.duration, watchedValues.due_date, form, workingHours]);

  const onSubmit = async (values: any) => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get default todo type if none selected
      let typeId = values.type_id;
      if (!typeId && todoTypes.length > 0) {
        const defaultType = todoTypes.find(t => t.name === 'General Task') || todoTypes[0];
        typeId = defaultType.id;
      }
      
      const { error } = await supabase
        .from('todos')
        .insert({
          tenant_id: currentTenant.id,
          entity_type: entityType === 'standalone' ? 'standalone' : entityType,
          entity_id: entityType === 'standalone' ? null : entityId,
          title: values.title,
          description: values.description || null,
          due_date: values.due_date || null,
          due_time: values.due_time || null,
          start_time: values.start_time || null,
          duration: values.duration || 10,
          priority: values.priority || 'medium',
          status: 'pending',
          assigned_to: values.assigned_to === 'unassigned' ? user.id : values.assigned_to || user.id,
          payment_term_id: values.payment_term_id === 'none' ? null : values.payment_term_id || null,
          contact_id: values.contact_id === 'none' ? null : values.contact_id || null,
          type_id: typeId,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('To-Do item created successfully');
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating todo:', error);
      toast.error('Failed to create to-do item');
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Add To-Do
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create To-Do Item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter to-do title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                  )}
                />

                <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter description" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border border-border shadow-md z-50">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border border-border shadow-md z-50">
                        {todoTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <DurationInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Task duration"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border border-border shadow-md z-50">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.first_name} {profile.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact dropdown */}
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Contact (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contact" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background border border-border shadow-md z-50">
                      <SelectItem value="none">No contact</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name} {contact.email && `(${contact.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment terms dropdown for contracts */}
            {entityType === 'contract' && paymentTerms.length > 0 && (
              <FormField
                control={form.control}
                name="payment_term_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Payment Term (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment term" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border border-border shadow-md z-50">
                        <SelectItem value="none">No payment term</SelectItem>
                        {paymentTerms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            Payment {term.installment_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create To-Do'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};