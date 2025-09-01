import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.date().optional(),
  assigned_to: z.string().min(1, 'Assigned user is required'),
  type: z.string().min(1, 'Task type is required'),
});

type TodoFormData = z.infer<typeof todoSchema>;

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface TaskType {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface CreateTodoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entityId: string;
  entityType: 'contact' | 'company' | 'site' | 'customer' | 'deal';
  entityName: string;
}

export const CreateTodoModal = ({
  open,
  onClose,
  onSuccess,
  entityId,
  entityType,
  entityName,
}: CreateTodoModalProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      assigned_to: user?.id || '',
      type: '',
    },
  });

  const fetchTenantUsers = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('user_tenant_memberships')
        .select(`
          user_id,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true);

      if (error) throw error;

      const tenantUsers = data
        ?.map(membership => membership.profiles)
        .filter(Boolean) as User[];

      setUsers(tenantUsers || []);
    } catch (error) {
      console.error('Error fetching tenant users:', error);
    }
  };

  const fetchTaskTypes = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('task_types')
        .select('id, name, description, color')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTaskTypes(data || []);
    } catch (error) {
      console.error('Error fetching task types:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTenantUsers();
      fetchTaskTypes();
      // Reset form when opening
      form.reset({
        assigned_to: user?.id || '',
        type: taskTypes.length > 0 ? taskTypes[0].id : '',
      });
    }
  }, [open, currentTenant, user, form]);

  const onSubmit = async (data: TodoFormData) => {
    if (!currentTenant || !user) return;

    setIsLoading(true);
    try {
      // Find the selected task type to get the name
      const selectedTaskType = taskTypes.find(t => t.id === data.type);
      
      // Map task type names to valid enum values
      const mapTaskTypeToEnum = (taskTypeName: string): 'call' | 'email' | 'meeting' | 'task' => {
        const name = taskTypeName.toLowerCase();
        if (name.includes('call')) return 'call';
        if (name.includes('email')) return 'email';
        if (name.includes('meeting')) return 'meeting';
        return 'task'; // default fallback
      };
      
      const taskTypeName = selectedTaskType ? mapTaskTypeToEnum(selectedTaskType.name) : 'task';
      
      const activityData = {
        tenant_id: currentTenant.id,
        type: taskTypeName,
        title: data.title,
        description: data.description || null,
        due_date: data.due_date?.toISOString() || null,
        assigned_to: data.assigned_to,
        created_by: user.id,
        completed: false,
        [`${entityType}_id`]: entityId,
      };

      const { error } = await supabase
        .from('activities')
        .insert(activityData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'To-Do created successfully',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create To-Do</DialogTitle>
          <DialogDescription>
            Create a new task for {entityName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {taskTypes.map((taskType) => (
                        <SelectItem key={taskType.id} value={taskType.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: taskType.color }}
                            />
                            {taskType.name}
                          </div>
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Task title" {...field} />
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
                    <Textarea placeholder="Task description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create To-Do'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};