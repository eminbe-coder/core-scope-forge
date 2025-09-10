import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

export interface Todo {
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
  entity_type: string;
  entity_id: string;
  assigned_profile?: { first_name: string; last_name: string } | null;
  completed_by_profile?: { first_name: string; last_name: string } | null;
  created_by_profile?: { first_name: string; last_name: string } | null;
  todo_types?: { name: string; color: string; icon: string } | null;
  // Hierarchy metadata
  source_entity_type?: string;
  source_entity_name?: string;
  installment_number?: number;
}

interface UseTodoHierarchyOptions {
  entityType: string;
  entityId: string;
  paymentTermId?: string;
  includeChildren?: boolean;
}

export const useTodoHierarchy = ({ 
  entityType, 
  entityId, 
  paymentTermId,
  includeChildren = true 
}: UseTodoHierarchyOptions) => {
  const { currentTenant } = useTenant();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodoHierarchy = async () => {
    if (!currentTenant?.id || !entityType || !entityId) {
      setTodos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const allTodos: Todo[] = [];

      // If paymentTermId is specified, only get todos for that specific payment term
      if (paymentTermId) {
        const { data, error } = await supabase
          .from('todos')
          .select(`
            *,
            assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
            completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
            created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
            todo_types (name, color, icon)
          `)
          .eq('tenant_id', currentTenant.id)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('payment_term_id', paymentTermId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Add payment term metadata
        if (data && data.length > 0) {
          const { data: paymentTerm } = await supabase
            .from('contract_payment_terms')
            .select('installment_number')
            .eq('id', paymentTermId)
            .single();

          const todosWithMetadata = data.map(todo => ({
            ...todo,
            source_entity_type: 'payment_term',
            source_entity_name: paymentTerm ? `Payment ${paymentTerm.installment_number}` : 'Payment Term',
            installment_number: paymentTerm?.installment_number
          }));
          
          allTodos.push(...todosWithMetadata);
        }
      } else {
        // Get direct todos for the entity
        const { data: directTodos, error: directError } = await supabase
          .from('todos')
          .select(`
            *,
            assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
            completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
            created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
            todo_types (name, color, icon)
          `)
          .eq('tenant_id', currentTenant.id)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .is('payment_term_id', null) // Only direct entity todos, not payment-linked ones
          .order('created_at', { ascending: false });

        if (directError) throw directError;

        if (directTodos) {
          const todosWithMetadata = directTodos.map(todo => ({
            ...todo,
            source_entity_type: entityType,
            source_entity_name: entityType.charAt(0).toUpperCase() + entityType.slice(1)
          }));
          allTodos.push(...todosWithMetadata);
        }

        // Get child entity todos if includeChildren is true
        if (includeChildren) {
          await fetchChildTodos(entityType, entityId, allTodos);
        }
      }

      setTodos(allTodos);
    } catch (err) {
      console.error('Error fetching todo hierarchy:', err);
      setError('Failed to load to-do items');
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildTodos = async (parentType: string, parentId: string, allTodos: Todo[]) => {
    try {
      switch (parentType) {
        case 'contract':
          // Get todos from all payment terms of this contract
          const { data: paymentTerms } = await supabase
            .from('contract_payment_terms')
            .select('id, installment_number')
            .eq('contract_id', parentId);

          if (paymentTerms && paymentTerms.length > 0) {
            for (const term of paymentTerms) {
              const { data: paymentTodos } = await supabase
                .from('todos')
                .select(`
                  *,
                  assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
                  completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
                  created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
                  todo_types (name, color, icon)
                `)
                .eq('tenant_id', currentTenant.id)
                .eq('payment_term_id', term.id)
                .order('created_at', { ascending: false });

              if (paymentTodos) {
                const todosWithMetadata = paymentTodos.map(todo => ({
                  ...todo,
                  source_entity_type: 'payment_term',
                  source_entity_name: `Payment ${term.installment_number}`,
                  installment_number: term.installment_number
                }));
                allTodos.push(...todosWithMetadata);
              }
            }
          }
          break;

        case 'deal':
          // Get todos from converted contracts
          const { data: dealContracts } = await supabase
            .from('contracts')
            .select('id, name')
            .eq('deal_id', parentId);

          if (dealContracts && dealContracts.length > 0) {
            for (const contract of dealContracts) {
              // Get contract todos
              const { data: contractTodos } = await supabase
                .from('todos')
                .select(`
                  *,
                  assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
                  completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
                  created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
                  todo_types (name, color, icon)
                `)
                .eq('tenant_id', currentTenant.id)
                .eq('entity_type', 'contract')
                .eq('entity_id', contract.id)
                .is('payment_term_id', null)
                .order('created_at', { ascending: false });

              if (contractTodos) {
                const todosWithMetadata = contractTodos.map(todo => ({
                  ...todo,
                  source_entity_type: 'contract',
                  source_entity_name: `Contract: ${contract.name}`
                }));
                allTodos.push(...todosWithMetadata);
              }

              // Also get payment term todos from this contract
              const { data: contractPaymentTerms } = await supabase
                .from('contract_payment_terms')
                .select('id, installment_number')
                .eq('contract_id', contract.id);

              if (contractPaymentTerms && contractPaymentTerms.length > 0) {
                for (const term of contractPaymentTerms) {
                  const { data: paymentTodos } = await supabase
                    .from('todos')
                    .select(`
                      *,
                      assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
                      completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
                      created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
                      todo_types (name, color, icon)
                    `)
                    .eq('tenant_id', currentTenant.id)
                    .eq('payment_term_id', term.id)
                    .order('created_at', { ascending: false });

                  if (paymentTodos) {
                    const todosWithMetadata = paymentTodos.map(todo => ({
                      ...todo,
                      source_entity_type: 'payment_term',
                      source_entity_name: `${contract.name} - Payment ${term.installment_number}`,
                      installment_number: term.installment_number
                    }));
                    allTodos.push(...todosWithMetadata);
                  }
                }
              }
            }
          }
          break;

        case 'site':
          // Get todos from deals linked to this site
          const { data: siteDeals } = await supabase
            .from('deals')
            .select('id, name')
            .eq('site_id', parentId);

          if (siteDeals && siteDeals.length > 0) {
            for (const deal of siteDeals) {
              // Get deal todos
              const { data: dealTodos } = await supabase
                .from('todos')
                .select(`
                  *,
                  assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
                  completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
                  created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
                  todo_types (name, color, icon)
                `)
                .eq('tenant_id', currentTenant.id)
                .eq('entity_type', 'deal')
                .eq('entity_id', deal.id)
                .order('created_at', { ascending: false });

              if (dealTodos) {
                const todosWithMetadata = dealTodos.map(todo => ({
                  ...todo,
                  source_entity_type: 'deal',
                  source_entity_name: `Deal: ${deal.name}`
                }));
                allTodos.push(...todosWithMetadata);
              }
            }
          }

          // Also get todos from contracts linked to this site
          const { data: siteContracts } = await supabase
            .from('contracts')
            .select('id, name')
            .eq('site_id', parentId);

          if (siteContracts && siteContracts.length > 0) {
            for (const contract of siteContracts) {
              // Get contract todos
              const { data: contractTodos } = await supabase
                .from('todos')
                .select(`
                  *,
                  assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
                  completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
                  created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
                  todo_types (name, color, icon)
                `)
                .eq('tenant_id', currentTenant.id)
                .eq('entity_type', 'contract')
                .eq('entity_id', contract.id)
                .is('payment_term_id', null)
                .order('created_at', { ascending: false });

              if (contractTodos) {
                const todosWithMetadata = contractTodos.map(todo => ({
                  ...todo,
                  source_entity_type: 'contract',
                  source_entity_name: `Contract: ${contract.name}`
                }));
                allTodos.push(...todosWithMetadata);
              }
            }
          }
          break;

        case 'project':
          // Get todos from the linked deal
          const { data: project } = await supabase
            .from('projects')
            .select(`
              deal_id,
              deals (id, name)
            `)
            .eq('id', parentId)
            .single();

          if (project?.deal_id) {
            // Get deal todos
            const { data: dealTodos } = await supabase
              .from('todos')
              .select(`
                *,
                assigned_profile:profiles!todos_assigned_to_fkey (first_name, last_name),
                completed_by_profile:profiles!todos_completed_by_fkey (first_name, last_name),
                created_by_profile:profiles!todos_created_by_fkey (first_name, last_name),
                todo_types (name, color, icon)
              `)
              .eq('tenant_id', currentTenant.id)
              .eq('entity_type', 'deal')
              .eq('entity_id', project.deal_id)
              .order('created_at', { ascending: false });

            if (dealTodos) {
              const todosWithMetadata = dealTodos.map(todo => ({
                ...todo,
                source_entity_type: 'deal',
                source_entity_name: `Deal: ${(project.deals as any)?.name || 'Unknown'}`
              }));
              allTodos.push(...todosWithMetadata);
            }
          }
          break;

        // Add more cases as needed for other entity types
        default:
          break;
      }
    } catch (error) {
      console.error(`Error fetching child todos for ${parentType}:`, error);
    }
  };

  useEffect(() => {
    fetchTodoHierarchy();
  }, [currentTenant?.id, entityType, entityId, paymentTermId, includeChildren]);

  const refreshTodos = () => {
    fetchTodoHierarchy();
  };

  return {
    todos,
    loading,
    error,
    refreshTodos
  };
};