import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Handshake, DollarSign, Archive } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import { usePersistentFilters } from '@/hooks/use-persistent-filters';
import { EntityListing } from '@/components/entity-listing';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';
import { DealFilters, DealFilterOptions } from '@/components/deals/DealFilters';

interface Deal {
  id: string;
  tenant_id: string;
  customer_id?: string;
  site_id?: string;
  stage_id?: string;
  name: string;
  description?: string;
  value?: number;
  currency_id?: string;
  status: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability?: number;
  expected_close_date?: string;
  assigned_to?: string;
  notes?: string;
  customers: {
    name: string;
  } | null;
  sites: {
    name: string;
  } | null;
  currencies: {
    symbol: string;
  } | null;
  deal_stages: {
    name: string;
    win_percentage: number;
  } | null;
  assigned_user: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  next_step: {
    title: string;
    due_date: string;
  } | null;
  task_counts: {
    total: number;
    overdue: number;
  };
  created_at: string;
  updated_at: string;
}

const stageColors = {
  default: 'bg-gray-500',
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  won: 'bg-green-500',
  lost: 'bg-red-500',
};

const Deals = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { getVisibilityLevel, isAdmin } = usePermissions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const defaultDealFilters: DealFilterOptions = {
    selectedStages: [],
    selectedStatuses: [],
    selectedAssignees: [],
    showOverdueTasks: false,
    showNoTasks: false,
    sortBy: 'created_at',
    sortOrder: 'desc',
  };
  
  const [filters, setFilters, clearFilters] = usePersistentFilters<DealFilterOptions>('deals', defaultDealFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; deal: Deal | null }>({
    open: false,
    deal: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDeals = async () => {
    if (!currentTenant || !user) return;

    try {
      // Get user's visibility level for deals
      const visibilityLevel = await getVisibilityLevel('deals');
      
      // Build the query with all necessary joins
      let query = supabase
        .from('deals')
        .select(`
          *,
          customers(name),
          sites(name),
          currencies(symbol),
          deal_stages(name, win_percentage),
          assigned_user:profiles!deals_assigned_to_fkey(first_name, last_name, email)
        `)
        .eq('tenant_id', currentTenant.id)
        .is('deleted_at', null)
        .eq('is_converted', showArchived);

      // Apply visibility-based filtering
      if (!isAdmin) {
        if (visibilityLevel === 'own') {
          // Only show deals assigned to current user
          query = query.eq('assigned_to', user.id);
        } else if (visibilityLevel === 'department') {
          // Get users from same department
          const { data: userDept } = await supabase
            .from('user_department_assignments')
            .select('department_id')
            .eq('user_id', user.id)
            .eq('tenant_id', currentTenant.id)
            .maybeSingle();

          if (userDept) {
            const { data: deptUsers } = await supabase
              .from('user_department_assignments')
              .select('user_id')
              .eq('department_id', userDept.department_id)
              .eq('tenant_id', currentTenant.id);

            if (deptUsers && deptUsers.length > 0) {
              const userIds = deptUsers.map(du => du.user_id);
              query = query.in('assigned_to', userIds);
            }
          }
        } else if (visibilityLevel === 'branch') {
          // Get users from same branch
          const { data: userBranch } = await supabase
            .from('user_department_assignments')
            .select(`
              departments (
                branch_id
              )
            `)
            .eq('user_id', user.id)
            .eq('tenant_id', currentTenant.id)
            .maybeSingle();

          if (userBranch?.departments?.branch_id) {
            const { data: branchDepts } = await supabase
              .from('departments')
              .select('id')
              .eq('branch_id', userBranch.departments.branch_id)
              .eq('tenant_id', currentTenant.id);

            if (branchDepts && branchDepts.length > 0) {
              const deptIds = branchDepts.map(d => d.id);
              const { data: branchUsers } = await supabase
                .from('user_department_assignments')
                .select('user_id')
                .in('department_id', deptIds)
                .eq('tenant_id', currentTenant.id);

              if (branchUsers && branchUsers.length > 0) {
                const userIds = branchUsers.map(bu => bu.user_id);
                query = query.in('assigned_to', userIds);
              }
            }
          }
        } else if (visibilityLevel === 'selected_users') {
          // Get allowed user IDs from user_visibility_permissions
          const { data: visibilitySettings } = await supabase
            .from('user_visibility_permissions')
            .select('allowed_user_ids')
            .eq('user_id', user.id)
            .eq('tenant_id', currentTenant.id)
            .eq('entity_type', 'deals')
            .maybeSingle();

          if (visibilitySettings?.allowed_user_ids && visibilitySettings.allowed_user_ids.length > 0) {
            query = query.in('assigned_to', visibilitySettings.allowed_user_ids);
          }
        }
        // For 'all' visibility level, no additional filtering needed
      }

      // Apply filters
      if (filters.selectedStages.length > 0) {
        query = query.in('stage_id', filters.selectedStages);
      }
      
      if (filters.selectedStatuses.length > 0) {
        query = query.in('deal_status_id', filters.selectedStatuses);
      }
      
      if (filters.selectedAssignees.length > 0) {
        query = query.in('assigned_to', filters.selectedAssignees);
      }

      // Apply sorting
      const getSortColumn = (sortBy: string) => {
        switch (sortBy) {
          case 'expected_close_date': return 'expected_close_date';
          case 'value': return 'value';
          case 'name': return 'name';
          case 'created_at': return 'created_at';
          default: return 'created_at';
        }
      };

      const sortColumn = getSortColumn(filters.sortBy);
      if (!['next_task_date'].includes(filters.sortBy)) {
        query = query.order(sortColumn, { 
          ascending: filters.sortOrder === 'asc',
          nullsFirst: false 
        });
      }

      const { data: dealsData, error } = await query;

      if (error) throw error;

      // Fetch next tasks and task counts for all deals in one query
      const dealIds = (dealsData || []).map(d => d.id);
      let nextByDeal: Record<string, { title: string; due_date: string } | null> = {};
      let taskCountsByDeal: Record<string, { total: number; overdue: number }> = {};
      
      if (dealIds.length > 0) {
        // Fetch all tasks
        const { data: tasks } = await supabase
          .from('activities')
          .select('id, title, due_date, completed, type, deal_id')
          .in('deal_id', dealIds)
          .eq('type', 'task');

        const now = new Date().toISOString();
        
        // Process tasks to get counts and next steps
        for (const task of tasks || []) {
          if (!task.deal_id) continue;
          
          // Initialize counts
          if (!taskCountsByDeal[task.deal_id]) {
            taskCountsByDeal[task.deal_id] = { total: 0, overdue: 0 };
          }
          
          taskCountsByDeal[task.deal_id].total++;
          
          // Count overdue tasks
          if (!task.completed && task.due_date && task.due_date < now) {
            taskCountsByDeal[task.deal_id].overdue++;
          }
          
          // Find next step (earliest uncompleted task)
          if (!task.completed && task.due_date && !nextByDeal[task.deal_id]) {
            nextByDeal[task.deal_id] = { title: task.title, due_date: task.due_date };
          } else if (!task.completed && task.due_date && nextByDeal[task.deal_id] && 
                     task.due_date < nextByDeal[task.deal_id]!.due_date) {
            nextByDeal[task.deal_id] = { title: task.title, due_date: task.due_date };
          }
        }
      }

      let processedDeals = (dealsData || []).map(deal => ({
        ...deal,
        next_step: nextByDeal[deal.id] || null,
        task_counts: taskCountsByDeal[deal.id] || { total: 0, overdue: 0 },
      }));

      // Apply task-based filters
      if (filters.showOverdueTasks) {
        processedDeals = processedDeals.filter(deal => deal.task_counts.overdue > 0);
      }
      
      if (filters.showNoTasks) {
        processedDeals = processedDeals.filter(deal => deal.task_counts.total === 0);
      }

      // Apply task-based sorting
      if (filters.sortBy === 'next_task_date') {
        processedDeals.sort((a, b) => {
          const aDate = a.next_step?.due_date;
          const bDate = b.next_step?.due_date;
          
          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;
          
          const comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
          return filters.sortOrder === 'asc' ? comparison : -comparison;
        });
      }
      
      setDeals(processedDeals);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [currentTenant, user, showArchived, filters, getVisibilityLevel]);

  const handleEdit = (deal: Deal) => {
    navigate(`/deals/edit/${deal.id}`);
  };

  const handleDelete = (deal: Deal) => {
    setDeleteModal({ open: true, deal });
  };

  const confirmDelete = async () => {
    if (!deleteModal.deal || !currentTenant?.id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_entity', {
        _table_name: 'deals',
        _entity_id: deleteModal.deal.id,
        _tenant_id: currentTenant.id
      });

      if (error) throw error;

      await fetchDeals();
      toast({
        title: 'Success',
        description: 'Deal moved to recycle bin',
      });
      setDeleteModal({ open: false, deal: null });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredDeals = deals.filter(deal =>
    deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.customers?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Deals</h1>
          <p className="text-muted-foreground">Track and manage sales opportunities</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-2"
        >
          <Archive className="h-4 w-4" />
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </Button>
      </div>

      <DealFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        totalResults={filteredDeals.length}
      />
      
      <EntityListing
        title={showArchived ? "Archived Deals" : "Active Deals"}
        description={showArchived ? "View your completed and archived deals" : "Track and manage active sales opportunities"}
        icon={Handshake}
        entities={filteredDeals}
        loading={loading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAdd={() => navigate('/deals/add')}
        addButtonText="Add Deal"
        getEntityCardProps={(deal) => ({
          id: deal.id,
          title: deal.name,
          icon: Handshake,
          badge: {
            text: deal.deal_stages?.name || 'No Stage',
            className: `text-white ${deal.deal_stages?.win_percentage >= 80 ? stageColors.won : 
                                   deal.deal_stages?.win_percentage >= 60 ? stageColors.high :
                                   deal.deal_stages?.win_percentage >= 30 ? stageColors.medium :
                                   deal.deal_stages?.win_percentage >= 10 ? stageColors.low :
                                   stageColors.default}`,
            variant: 'secondary',
          },
          fields: [
            ...(deal.value ? [{
              icon: DollarSign,
              value: `${deal.currencies?.symbol || '$'}${deal.value.toLocaleString()}${deal.probability > 0 ? ` (${deal.probability}%)` : ''}`,
              isSecondary: false,
            }] : []),
            ...(deal.customers ? [{
              label: 'Customer',
              value: deal.customers.name,
              isSecondary: true,
            }] : []),
            ...(deal.assigned_user ? [{
              label: 'Salesperson',
              value: `${deal.assigned_user.first_name} ${deal.assigned_user.last_name}`.trim(),
              isSecondary: true,
            }] : []),
            ...(deal.sites ? [{
              label: 'Site',
              value: deal.sites.name,
              isSecondary: true,
            }] : []),
            ...(deal.expected_close_date ? [{
              label: 'Expected close',
              value: new Date(deal.expected_close_date).toLocaleDateString(),
              isSecondary: true,
            }] : []),
            ...(deal.next_step ? [{
              label: 'Next step',
              value: `${deal.next_step.title} (${new Date(deal.next_step.due_date).toLocaleDateString()})`,
              isSecondary: true,
            }] : []),
            {
              value: `Created ${new Date(deal.created_at).toLocaleDateString()}`,
              isSecondary: true,
            },
          ],
          onClick: () => navigate(`/deals/edit/${deal.id}`),
        })}
        columns={[
          {
            key: 'name',
            label: 'Deal',
            render: (_, deal) => (
              <div className="space-y-1">
                <div className="font-medium">{deal.name}</div>
                <Badge 
                  className={`text-white ${deal.deal_stages?.win_percentage >= 80 ? stageColors.won : 
                                           deal.deal_stages?.win_percentage >= 60 ? stageColors.high :
                                           deal.deal_stages?.win_percentage >= 30 ? stageColors.medium :
                                           deal.deal_stages?.win_percentage >= 10 ? stageColors.low :
                                           stageColors.default}`}
                  variant="secondary"
                >
                  {deal.deal_stages?.name || 'No Stage'}
                </Badge>
              </div>
            ),
          },
          {
            key: 'value',
            label: 'Value',
            render: (_, deal) => (
              deal.value ? (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">
                    {deal.currencies?.symbol || '$'}{deal.value.toLocaleString()}
                  </span>
                  {deal.probability > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ({deal.probability}%)
                    </span>
                  )}
                </div>
              ) : '-'
            ),
          },
          {
            key: 'customer',
            label: 'Customer',
            render: (_, deal) => deal.customers?.name || '-',
          },
          {
            key: 'salesperson',
            label: 'Salesperson',
            render: (_, deal) => deal.assigned_user ? 
              `${deal.assigned_user.first_name} ${deal.assigned_user.last_name}`.trim() : '-',
          },
          {
            key: 'expected_close_date',
            label: 'Expected Close',
            render: (value) => value ? new Date(value).toLocaleDateString() : '-',
          },
          {
            key: 'next_step',
            label: 'Next Step',
            render: (_, deal) => deal.next_step ? 
              `${deal.next_step.title} (${new Date(deal.next_step.due_date).toLocaleDateString()})` : 
              '-',
          },
        ]}
        onEdit={handleEdit}
        onDelete={handleDelete}
        editPermission="deals.edit"
        deletePermission="deals.delete"
        emptyStateMessage={showArchived ? "No archived deals found." : "Start tracking sales opportunities by creating your first deal."}
      />
      
      <DeleteConfirmationModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, deal: null })}
        onConfirm={confirmDelete}
        title="Delete Deal"
        description={`Are you sure you want to delete "${deleteModal.deal?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </DashboardLayout>
  );
};

export default Deals;