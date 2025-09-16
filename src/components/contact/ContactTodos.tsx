import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Circle, Calendar, User, Clock, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: string;
  completed_at?: string;
  entity_type: string;
  entity_id: string;
  assigned_profile?: { first_name: string; last_name: string } | null;
  created_by_profile?: { first_name: string; last_name: string } | null;
  todo_types?: { name: string; color: string; icon: string } | null;
  created_at: string;
  // Entity information for linking
  entity_name?: string;
}

interface ContactTodosProps {
  contactId: string;
  contactName: string;
}

export const ContactTodos = ({ contactId, contactName }: ContactTodosProps) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchContactTodos = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      // Fetch all todos that are linked to this contact
      const { data, error } = await supabase
        .from('todos')
        .select(`
          *,
          assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
          created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
          todo_types (name, color, icon)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich todos with entity names for better display
      const enrichedTodos = await Promise.all((data || []).map(async (todo) => {
        let entityName = 'Unknown';
        
        try {
          switch (todo.entity_type) {
            case 'deal':
              const { data: dealData } = await supabase
                .from('deals')
                .select('name')
                .eq('id', todo.entity_id)
                .single();
              entityName = dealData?.name || 'Unknown Deal';
              break;
            case 'contract':
              const { data: contractData } = await supabase
                .from('contracts')
                .select('name')
                .eq('id', todo.entity_id)
                .single();
              entityName = contractData?.name || 'Unknown Contract';
              break;
            case 'company':
              const { data: companyData } = await supabase
                .from('companies')
                .select('name')
                .eq('id', todo.entity_id)
                .single();
              entityName = companyData?.name || 'Unknown Company';
              break;
            case 'site':
              const { data: siteData } = await supabase
                .from('sites')
                .select('name')
                .eq('id', todo.entity_id)
                .single();
              entityName = siteData?.name || 'Unknown Site';
              break;
            case 'contact':
              const { data: contactData } = await supabase
                .from('contacts')
                .select('first_name, last_name')
                .eq('id', todo.entity_id)
                .single();
              entityName = contactData ? `${contactData.first_name} ${contactData.last_name}` : 'Unknown Contact';
              break;
          }
        } catch (err) {
          console.error('Error fetching entity name:', err);
        }

        return {
          ...todo,
          entity_name: entityName
        };
      }));

      setTodos(enrichedTodos);
    } catch (error) {
      console.error('Error fetching contact todos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contact todos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTodoComplete = async (todoId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase
        .from('todos')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
          completed_by: newStatus === 'completed' ? user?.id : null
        })
        .eq('id', todoId);

      if (error) throw error;

      await fetchContactTodos();
      toast({
        title: 'Success',
        description: `Todo ${newStatus === 'completed' ? 'completed' : 'reopened'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const navigateToEntity = (entityType: string, entityId: string) => {
    switch (entityType) {
      case 'deal':
        navigate(`/deals/${entityId}`);
        break;
      case 'contract':
        navigate(`/contracts/${entityId}`);
        break;
      case 'company':
        navigate(`/companies/${entityId}`);
        break;
      case 'site':
        navigate(`/sites/${entityId}`);
        break;
      case 'contact':
        navigate(`/contacts/${entityId}`);
        break;
      default:
        console.warn('Unknown entity type:', entityType);
    }
  };

  useEffect(() => {
    fetchContactTodos();
  }, [contactId, currentTenant]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p>Loading contact todos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Tasks Related to {contactName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todos.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tasks related to this contact yet</p>
            <p className="text-sm text-muted-foreground">Tasks will appear here when they are linked to this contact</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {todos.map((todo, index) => {
                const completed = todo.status === 'completed';
                
                return (
                  <div key={todo.id}>
                    <div className="flex items-start gap-3">
                      <div className={`p-1 rounded-full ${
                        completed ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {completed ? (
                          <CheckCircle 
                            className="h-4 w-4 text-green-600 cursor-pointer"
                            onClick={() => toggleTodoComplete(todo.id, todo.status)}
                          />
                        ) : (
                          <Circle 
                            className="h-4 w-4 text-gray-600 cursor-pointer"
                            onClick={() => toggleTodoComplete(todo.id, todo.status)}
                          />
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${completed ? 'line-through text-muted-foreground' : ''}`}>
                            {todo.title}
                          </span>
                          
                          <Badge 
                            variant="secondary" 
                            className={`text-white text-xs ${getPriorityColor(todo.priority)}`}
                          >
                            {todo.priority}
                          </Badge>
                          
                          {todo.todo_types && (
                            <Badge variant="outline" className="text-xs">
                              {todo.todo_types.name}
                            </Badge>
                          )}
                          
                          <button
                            onClick={() => navigateToEntity(todo.entity_type, todo.entity_id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {todo.entity_name}
                          </button>
                        </div>
                        
                        {todo.description && (
                          <p className={`text-sm text-muted-foreground ${completed ? 'line-through' : ''}`}>
                            {todo.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {todo.assigned_profile && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {todo.assigned_profile.first_name} {todo.assigned_profile.last_name}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(todo.created_at), 'MMM d, yyyy')}
                          </div>
                          
                          {todo.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {format(new Date(todo.due_date), 'MMM d, yyyy')}
                            </div>
                          )}
                          
                          {todo.completed_at && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Completed: {format(new Date(todo.completed_at), 'MMM d, yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {index < todos.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};