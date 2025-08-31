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
import { Plus, CheckCircle, Clock, AlertTriangle, User, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.string().optional().default('medium'),
  payment_term_id: z.string().optional(),
});

interface Todo {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  priority: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  payment_term_id?: string;
  created_at: string;
  profiles?: { first_name: string; last_name: string } | null;
  contract_payment_terms?: { installment_number: number } | null;
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

      // Check if user can modify this contract
      const { data: canModify } = await supabase.rpc('user_can_modify_contract', {
        _contract_id: contractId,
        _user_id: user.id
      });

      setCanUserEdit(canModify || false);

      const [todosRes, paymentTermsRes, profilesRes] = await Promise.all([
        supabase
          .from('contract_todos')
          .select(`
            *,
            profiles (first_name, last_name),
            contract_payment_terms (installment_number)
          `)
          .eq('contract_id', contractId)
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
        `).eq('tenant_id', currentTenant?.id).eq('active', true)
      ]);

      if (todosRes.error) throw todosRes.error;
      if (paymentTermsRes.error) throw paymentTermsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setTodos(todosRes.data as unknown as Todo[] || []);
      setPaymentTerms(paymentTermsRes.data as unknown as PaymentTerm[] || []);
      setProfiles((profilesRes.data || []).map((membership: any) => membership.profiles).filter(Boolean));
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
      
      const { error } = await supabase
        .from('contract_todos')
        .insert({
          ...values,
          contract_id: contractId,
          tenant_id: currentTenant.id,
          created_by: user?.id,
          due_date: values.due_date || null,
          assigned_to: values.assigned_to || null,
          payment_term_id: values.payment_term_id || null,
        });

      if (error) throw error;

      // Log audit trail
      await supabase.from('contract_audit_logs').insert({
        contract_id: contractId,
        tenant_id: currentTenant.id,
        action: 'todo_added',
        entity_type: 'todo',
        user_id: user?.id,
        user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
        notes: `Added todo: ${values.title}`,
      });

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

  const toggleTodoCompletion = async (todoId: string, completed: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        completed: !completed,
        updated_at: new Date().toISOString(),
      };

      if (!completed) {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user?.id;
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      const { error } = await supabase
        .from('contract_todos')
        .update(updateData)
        .eq('id', todoId);

      if (error) throw error;

      // Log audit trail
      await supabase.from('contract_audit_logs').insert({
        contract_id: contractId,
        tenant_id: currentTenant?.id,
        action: completed ? 'todo_uncompleted' : 'todo_completed',
        entity_type: 'todo',
        entity_id: todoId,
        user_id: user?.id,
        user_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
        notes: `Todo ${completed ? 'uncompleted' : 'completed'}`,
      });

      toast.success(`To-do item ${completed ? 'uncompleted' : 'completed'}`);
      fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update to-do item');
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
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
    if (filter === 'completed') return todo.completed;
    if (filter === 'pending') return !todo.completed;
    return true;
  });

  const todosStats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length,
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
                  <DialogContent>
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
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
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
                                <SelectContent>
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
                                <SelectContent>
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
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
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

          <div className="space-y-3">
            {filteredTodos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No to-do items found.
              </p>
            ) : (
              filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`border rounded-lg p-4 space-y-2 ${
                    todo.completed ? 'bg-muted/50' : 'bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {canUserEdit && canEdit && (
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => toggleTodoCompletion(todo.id, todo.completed)}
                          className="mt-1"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {todo.title}
                          </h4>
                          {getPriorityIcon(todo.priority)}
                          <Badge variant="outline" className="text-xs">
                            {todo.priority}
                          </Badge>
                          {todo.contract_payment_terms && (
                            <Badge variant="secondary" className="text-xs">
                              Payment {todo.contract_payment_terms.installment_number}
                            </Badge>
                          )}
                        </div>
                        {todo.description && (
                          <p className={`text-sm ${todo.completed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                            {todo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          {todo.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {formatDate(todo.due_date)}
                            </div>
                          )}
                          {todo.profiles && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {todo.profiles.first_name} {todo.profiles.last_name}
                            </div>
                          )}
                          {todo.completed && todo.completed_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Completed: {formatDate(todo.completed_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};