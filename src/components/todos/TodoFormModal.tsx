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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

interface TodoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  entityType: string;
  entityId: string;
  paymentTermId?: string;
  // For pre-populating from existing todo
  initialData?: {
    title?: string;
    description?: string;
    assigned_to?: string;
    due_date?: string;
    due_time?: string;
    start_time?: string;
    duration?: number;
    priority?: string;
    type_id?: string;
    contact_id?: string;
  };
}

export const TodoFormModal = ({ 
  open,
  onOpenChange,
  onSuccess,
  entityType, 
  entityId, 
  paymentTermId,
  initialData
}: TodoFormModalProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { calculateStartTime, workingHours } = useWorkingHours();
  const [todoTypes, setTodoTypes] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      assigned_to: initialData?.assigned_to || user?.id || 'unassigned',
      due_date: initialData?.due_date || '',
      due_time: initialData?.due_time || '',
      start_time: initialData?.start_time || '',
      duration: initialData?.duration || 10,
      priority: initialData?.priority || 'medium',
      type_id: initialData?.type_id || '',
      payment_term_id: paymentTermId || 'none',
      contact_id: initialData?.contact_id || 'none',
    },
  });

  useEffect(() => {
    if (open && currentTenant?.id) {
      fetchFormData();
      // Reset form with initial data when opening
      form.reset({
        title: initialData?.title || '',
        description: initialData?.description || '',
        assigned_to: initialData?.assigned_to || user?.id || 'unassigned',
        due_date: initialData?.due_date || '',
        due_time: initialData?.due_time || '',
        start_time: initialData?.start_time || '',
        duration: initialData?.duration || 10,
        priority: initialData?.priority || 'medium',
        type_id: initialData?.type_id || '',
        payment_term_id: paymentTermId || 'none',
        contact_id: initialData?.contact_id || 'none',
      });
    }
  }, [open, currentTenant?.id, entityType, entityId, user?.id, initialData]);

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
          entity_type: entityType,
          entity_id: entityId,
          title: values.title,
          description: values.description || null,
          due_date: values.due_date || null,
          due_time: values.due_time || null,
          start_time: values.start_time || null,
          duration: values.duration || 10,
          priority: values.priority || 'medium',
          status: 'pending',
          assigned_to: values.assigned_to === 'unassigned' ? null : values.assigned_to || null,
          payment_term_id: values.payment_term_id === 'none' ? null : values.payment_term_id || null,
          contact_id: values.contact_id === 'none' ? null : values.contact_id || null,
          type_id: typeId,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('To-Do item created successfully');
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating todo:', error);
      toast.error('Failed to create to-do item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New To-Do Item</DialogTitle>
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
                    <SelectContent>
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
                    <SelectContent>
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

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Todo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};