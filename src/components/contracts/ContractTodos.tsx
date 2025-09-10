import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CheckCircle2, Clock, AlertTriangle, User, Calendar, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.string().optional().default('medium'),
  payment_term_id: z.string().optional(),
  type_id: z.string().optional(),
});

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  completed_by?: string;
  payment_term_id?: string;
  created_at: string;
  completed_at?: string;
  type_id?: string;
  assigned_profile?: { first_name: string; last_name: string } | null;
  completed_by_profile?: { first_name: string; last_name: string } | null;
  created_by_profile?: { first_name: string; last_name: string } | null;
  contract_payment_terms?: { installment_number: number } | null;
  todo_types?: { name: string; color: string; icon: string } | null;
}

interface PaymentTerm {
  id: string;
  installment_number: number;
  calculated_amount: number;
  due_date?: string;
  contract_payment_stages?: { name: string } | null;
}

interface ContractTodosProps {
  contractId: string;
  canEdit: boolean;
  onUpdate: () => void;
  compact?: boolean;
}

export const ContractTodos = ({ contractId, canEdit, onUpdate, compact = false }: ContractTodosProps) => {
  const { currentTenant } = useTenant();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [todoTypes, setTodoTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [canUserEdit, setCanUserEdit] = useState(false);

  const form = useForm({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      priority: 'medium',
      payment_term_id: '',
      type_id: '',
    },
  });

  useEffect(() => {
    if (contractId && currentTenant?.id) {
      fetchData();
    }
  }, [contractId, currentTenant?.id]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Allow all tenant users to create and assign todos
      setCanUserEdit(true);

      const [todosRes, paymentTermsRes, profilesRes, todoTypesRes] = await Promise.all([
        supabase
          .from('todos')
          .select(`
            *,
            assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
            completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
            created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
            contract_payment_terms (installment_number),
            todo_types (name, color, icon)
          `)
          .eq('entity_type', 'contract')
          .eq('entity_id', contractId)
          .eq('tenant_id', currentTenant?.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('contract_payment_terms')
          .select(`
            *,
            contract_payment_stages (name)
          `)
          .eq('contract_id', contractId)
          .order('installment_number'),
        
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
          .from('todo_types')
          .select('*')
          .eq('tenant_id', currentTenant?.id)
          .eq('active', true)
          .order('sort_order')
      ]);

      if (todosRes.error) throw todosRes.error;
      if (paymentTermsRes.error) throw paymentTermsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (todoTypesRes.error) throw todoTypesRes.error;

      setTodos(todosRes.data as unknown as Todo[] || []);
      setPaymentTerms(paymentTermsRes.data as unknown as PaymentTerm[] || []);
      setProfiles((profilesRes.data || []).map((membership: any) => membership.profiles).filter(Boolean));
      setTodoTypes(todoTypesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load to-do items');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: any) => {
    if (!currentTenant?.id) return;

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
          entity_type: 'contract',
          entity_id: contractId,
          title: values.title,
          description: values.description || null,
          due_date: values.due_date || null,
          priority: values.priority || 'medium',
          status: 'pending',
          assigned_to: values.assigned_to || null,
          payment_term_id: values.payment_term_id || null,
          type_id: typeId,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('To-do item added successfully');
      setDialogOpen(false);
      form.reset();
      fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error adding todo:', error);
      toast.error('Failed to add to-do item');
    }
  };

  const toggleTodoCompletion = async (todoId: string, currentStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user?.id;
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      const { error } = await supabase
        .from('todos')
        .update(updateData)
        .eq('id', todoId);

      if (error) throw error;

      toast.success(`To-do item ${newStatus === 'completed' ? 'completed' : 'uncompleted'}`);
      fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update to-do item');
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;

      toast.success('To-do item deleted successfully');
      fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete to-do item');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Clock className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'completed') return todo.status === 'completed';
    if (filter === 'pending') return todo.status !== 'completed';
    return true;
  });

  const todosStats = {
    total: todos.length,
    completed: todos.filter(t => t.status === 'completed').length,
    pending: todos.filter(t => t.status !== 'completed').length,
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>To-Do Items</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Total: {todosStats.total}</span>
                <span>Completed: {todosStats.completed}</span>
                <span>Pending: {todosStats.pending}</span>
              </div>
              {canUserEdit && canEdit && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add To-Do
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add New To-Do Item</DialogTitle>
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
                                  <SelectItem value="">Unassigned</SelectItem>
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
                                  {paymentTerms.map((term) => (
                                    <SelectItem key={term.id} value={term.id}>
                                      Payment {term.installment_number} - {term.contract_payment_stages?.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Add To-Do</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          
          {!compact && (
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({todosStats.total})
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pending ({todosStats.pending})
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                Completed ({todosStats.completed})
              </Button>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {filteredTodos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {filter === 'all' 
                ? 'No to-do items yet. Add one to get started.' 
                : `No ${filter} to-do items.`
              }
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-center gap-3 p-4 border rounded-lg transition-colors",
                    todo.status === 'completed' ? "bg-muted/50 border-muted" : "bg-background border-border hover:border-primary/20"
                  )}
                >
                  <Checkbox
                    checked={todo.status === 'completed'}
                    onCheckedChange={() => toggleTodoCompletion(todo.id, todo.status)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={cn(
                        "font-medium",
                        todo.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {todo.title}
                      </h4>
                      
                      {/* Status badge */}
                      <Badge variant={
                        todo.status === 'completed' ? 'default' : 
                        todo.status === 'in_progress' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {todo.status === 'in_progress' ? 'In Progress' : 
                         todo.status === 'completed' ? 'Completed' : 'Pending'}
                      </Badge>
                      
                      {/* Priority badge */}
                      {(todo.priority === 'high' || todo.priority === 'urgent') && (
                        <Badge variant={todo.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                          {todo.priority === 'urgent' ? 'Urgent' : 'High Priority'}
                        </Badge>
                      )}
                      
                      {/* Type badge */}
                      {todo.todo_types && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ color: todo.todo_types.color, borderColor: todo.todo_types.color }}
                        >
                          {todo.todo_types.name}
                        </Badge>
                      )}
                      
                      {/* Payment term badge */}
                      {todo.contract_payment_terms && (
                        <Badge variant="outline" className="text-xs">
                          Payment {todo.contract_payment_terms.installment_number}
                        </Badge>
                      )}
                    </div>
                    
                    {todo.description && (
                      <p className={cn(
                        "text-sm mt-1",
                        todo.status === 'completed' ? "text-muted-foreground" : "text-muted-foreground"
                      )}>
                        {todo.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {todo.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {formatDate(todo.due_date)}
                        </div>
                      )}
                      {todo.assigned_profile && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {todo.assigned_profile.first_name} {todo.assigned_profile.last_name}
                        </div>
                      )}
                      {todo.status === 'completed' && todo.completed_at && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed: {formatDate(todo.completed_at)}
                        </div>
                      )}
                      {getPriorityIcon(todo.priority || 'medium')}
                    </div>
                  </div>
                  
                  {canUserEdit && canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTodo(todo.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};