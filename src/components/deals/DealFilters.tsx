import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FilterX, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/hooks/use-auth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface DealFilterOptions {
  selectedStages: string[];
  selectedStatuses: string[];
  selectedAssignees: string[];
  showOverdueTasks: boolean;
  showNoTasks: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface DealFiltersProps {
  filters: DealFilterOptions;
  onFiltersChange: (filters: DealFilterOptions) => void;
  totalResults: number;
}

interface DealStage {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const DEAL_STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const SORT_OPTIONS = [
  { value: 'expected_close_date_asc', label: 'Close Date (Earliest)' },
  { value: 'expected_close_date_desc', label: 'Close Date (Latest)' },
  { value: 'next_task_date_asc', label: 'Next Task (Earliest)' },
  { value: 'next_task_date_desc', label: 'Next Task (Latest)' },
  { value: 'value_desc', label: 'Value (Highest)' },
  { value: 'value_asc', label: 'Value (Lowest)' },
  { value: 'created_at_desc', label: 'Created (Newest)' },
  { value: 'created_at_asc', label: 'Created (Oldest)' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
];

export const DealFilters = ({ filters, onFiltersChange, totalResults }: DealFiltersProps) => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { getVisibilityLevel, isAdmin } = usePermissions();
  const [stages, setStages] = useState<DealStage[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibilityLevel, setVisibilityLevel] = useState<string>('own');

  useEffect(() => {
    const fetchFilterData = async () => {
      if (!currentTenant || !user) return;

      // Get user's visibility level for deals
      const userVisibilityLevel = await getVisibilityLevel('deals');
      setVisibilityLevel(userVisibilityLevel);

      // Fetch deal stages
      const { data: stagesData } = await supabase
        .from('deal_stages')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('sort_order');

      if (stagesData) setStages(stagesData);

      // Fetch profiles based on visibility level
      let profilesQuery = supabase
        .from('profiles')
        .select(`
          id, 
          first_name, 
          last_name, 
          email,
          user_tenant_memberships!inner(tenant_id)
        `)
        .eq('user_tenant_memberships.tenant_id', currentTenant.id)
        .eq('user_tenant_memberships.active', true);

      // Filter profiles based on visibility permissions
      if (userVisibilityLevel === 'own') {
        // Only show current user
        profilesQuery = profilesQuery.eq('id', user.id);
      } else if (userVisibilityLevel === 'department') {
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
            profilesQuery = profilesQuery.in('id', userIds);
          }
        }
      } else if (userVisibilityLevel === 'branch') {
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
              profilesQuery = profilesQuery.in('id', userIds);
            }
          }
        }
      } else if (userVisibilityLevel === 'selected_users') {
        // Get allowed user IDs from user_visibility_permissions
        const { data: visibilitySettings } = await supabase
          .from('user_visibility_permissions')
          .select('allowed_user_ids')
          .eq('user_id', user.id)
          .eq('tenant_id', currentTenant.id)
          .eq('entity_type', 'deals')
          .maybeSingle();

        if (visibilitySettings?.allowed_user_ids && visibilitySettings.allowed_user_ids.length > 0) {
          profilesQuery = profilesQuery.in('id', visibilitySettings.allowed_user_ids);
        }
      }
      // For 'all' visibility level, no additional filtering needed

      const { data: profilesData } = await profilesQuery.order('first_name');
      if (profilesData) setProfiles(profilesData);
    };

    fetchFilterData();
  }, [currentTenant, user, getVisibilityLevel]);

  const handleStageToggle = (stageId: string) => {
    const newStages = filters.selectedStages.includes(stageId)
      ? filters.selectedStages.filter(id => id !== stageId)
      : [...filters.selectedStages, stageId];
    
    onFiltersChange({ ...filters, selectedStages: newStages });
  };

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.selectedStatuses.includes(status)
      ? filters.selectedStatuses.filter(s => s !== status)
      : [...filters.selectedStatuses, status];
    
    onFiltersChange({ ...filters, selectedStatuses: newStatuses });
  };

  const handleAssigneeToggle = (assigneeId: string) => {
    const newAssignees = filters.selectedAssignees.includes(assigneeId)
      ? filters.selectedAssignees.filter(id => id !== assigneeId)
      : [...filters.selectedAssignees, assigneeId];
    
    onFiltersChange({ ...filters, selectedAssignees: newAssignees });
  };

  const handleSortChange = (sortValue: string) => {
    const parts = sortValue.split('_');
    const order = parts[parts.length - 1] as 'asc' | 'desc';
    const field = parts.slice(0, -1).join('_');
    
    onFiltersChange({ 
      ...filters, 
      sortBy: field,
      sortOrder: order
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      selectedStages: [],
      selectedStatuses: [],
      selectedAssignees: [],
      showOverdueTasks: false,
      showNoTasks: false,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  };

  const getActiveFilterCount = () => {
    return filters.selectedStages.length + 
           filters.selectedStatuses.length + 
           filters.selectedAssignees.length + 
           (filters.showOverdueTasks ? 1 : 0) + 
           (filters.showNoTasks ? 1 : 0);
  };

  const activeFilters = getActiveFilterCount();

  return (
    <div className="border rounded-lg p-4 mb-6 bg-card">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Filters & Sorting</h3>
              {activeFilters > 0 && (
                <Badge variant="secondary">{activeFilters} active</Badge>
              )}
            </div>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {totalResults} deal{totalResults !== 1 ? 's' : ''} found
            </span>
            {activeFilters > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <FilterX className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sort */}
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select 
                value={`${filters.sortBy}_${filters.sortOrder}`} 
                onValueChange={handleSortChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stages */}
            <div className="space-y-2">
              <Label>Stages ({filters.selectedStages.length})</Label>
              <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                {stages.map(stage => (
                  <div key={stage.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      id={`stage-${stage.id}`}
                      checked={filters.selectedStages.includes(stage.id)}
                      onChange={() => handleStageToggle(stage.id)}
                      className="rounded"
                    />
                    <label htmlFor={`stage-${stage.id}`} className="text-sm">
                      {stage.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Statuses */}
            <div className="space-y-2">
              <Label>Status ({filters.selectedStatuses.length})</Label>
              <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                {DEAL_STATUSES.map(status => (
                  <div key={status.value} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      id={`status-${status.value}`}
                      checked={filters.selectedStatuses.includes(status.value)}
                      onChange={() => handleStatusToggle(status.value)}
                      className="rounded"
                    />
                    <label htmlFor={`status-${status.value}`} className="text-sm">
                      {status.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignees - only show if user has visibility beyond 'own' */}
            {(visibilityLevel !== 'own' || isAdmin) && (
              <div className="space-y-2">
                <Label>Assigned To ({filters.selectedAssignees.length})</Label>
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                  {profiles.map(profile => (
                    <div key={profile.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        id={`assignee-${profile.id}`}
                        checked={filters.selectedAssignees.includes(profile.id)}
                        onChange={() => handleAssigneeToggle(profile.id)}
                        className="rounded"
                      />
                      <label htmlFor={`assignee-${profile.id}`} className="text-sm">
                        {profile.first_name} {profile.last_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Toggle Switches */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="overdue-tasks"
                  checked={filters.showOverdueTasks}
                  onCheckedChange={(checked) => 
                    onFiltersChange({ ...filters, showOverdueTasks: checked })
                  }
                />
                <Label htmlFor="overdue-tasks" className="text-sm">
                  Has overdue tasks
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="no-tasks"
                  checked={filters.showNoTasks}
                  onCheckedChange={(checked) => 
                    onFiltersChange({ ...filters, showNoTasks: checked })
                  }
                />
                <Label htmlFor="no-tasks" className="text-sm">
                  Has no tasks
                </Label>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};