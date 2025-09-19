import { useState, useEffect } from 'react';
import { Check, ChevronDown, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/use-permissions';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface Department {
  id: string;
  name: string;
  users: Profile[];
}

interface Branch {
  id: string;
  name: string;
  departments: Department[];
}

interface AssigneeFilterProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
}

export function AssigneeFilter({ selectedUserIds, onSelectionChange }: AssigneeFilterProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { getVisibilityLevel, isAdmin } = usePermissions();
  
  const [open, setOpen] = useState(false);
  const [visibilityLevel, setVisibilityLevel] = useState<string>('own');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant?.id && user?.id) {
      fetchVisibilityAndData();
    }
  }, [currentTenant?.id, user?.id]);

  const fetchVisibilityAndData = async () => {
    try {
      setLoading(true);
      const level = await getVisibilityLevel('todos');
      setVisibilityLevel(level);

      switch (level) {
        case 'own':
          // No filter needed - user only sees their own tasks
          setProfiles([]);
          break;
        case 'department':
          await fetchDepartmentUsers();
          break;
        case 'branch':
          await fetchBranchUsers();
          break;
        case 'all':
          await fetchAllUsers();
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentUsers = async () => {
    const { data: userDept } = await supabase
      .from('user_department_assignments')
      .select(`
        department_id,
        departments (
          id,
          name
        )
      `)
      .eq('user_id', user!.id)
      .eq('tenant_id', currentTenant!.id)
      .maybeSingle();

    if (!userDept) return;

    const { data: deptUsers } = await supabase
      .from('user_department_assignments')
      .select(`
        user_id
      `)
      .eq('department_id', userDept.department_id)
      .eq('tenant_id', currentTenant!.id);

    if (!deptUsers) return;

    const userIds = deptUsers.map(u => u.user_id);
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);

    const users = profiles || [];
    setProfiles(users);
    setDepartments([{
      id: userDept.department_id,
      name: userDept.departments?.name || 'Department',
      users
    }]);
  };

  const fetchBranchUsers = async () => {
    const { data: userBranch } = await supabase
      .from('user_department_assignments')
      .select(`
        departments (
          branch_id,
          branches (
            id,
            name
          )
        )
      `)
      .eq('user_id', user!.id)
      .eq('tenant_id', currentTenant!.id)
      .maybeSingle();

    if (!userBranch?.departments?.branch_id) return;

    const { data: branchDepts } = await supabase
      .from('departments')
      .select(`
        id,
        name,
        user_department_assignments (
          user_id
        )
      `)
      .eq('branch_id', userBranch.departments.branch_id)
      .eq('tenant_id', currentTenant!.id);

    if (!branchDepts) return;

    const departments = [];
    
    for (const dept of branchDepts) {
      const userIds = dept.user_department_assignments?.map(u => u.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        departments.push({
          id: dept.id,
          name: dept.name,
          users: profiles || []
        });
      }
    }

    const allUsers = departments.flatMap(d => d.users);
    setProfiles(allUsers);
    setDepartments(departments);
    setBranches([{
      id: userBranch.departments.branch_id,
      name: userBranch.departments.branches?.name || 'Branch',
      departments
    }]);
  };

  const fetchAllUsers = async () => {
    const { data: allUsers } = await supabase
      .from('user_tenant_memberships')
      .select(`
        user_id,
        profiles (
          id,
          first_name,
          last_name
        )
      `)
      .eq('tenant_id', currentTenant!.id)
      .eq('active', true);

    const users = allUsers?.map(u => u.profiles).filter(Boolean) as Profile[] || [];
    setProfiles(users);
  };

  const handleUserToggle = (userId: string) => {
    const newSelection = selectedUserIds.includes(userId)
      ? selectedUserIds.filter(id => id !== userId)
      : [...selectedUserIds, userId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    onSelectionChange(profiles.map(p => p.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (selectedUserIds.length === 0) {
      return visibilityLevel === 'own' ? 'My Tasks' : 'All Users';
    }
    if (selectedUserIds.length === 1) {
      const user = profiles.find(p => p.id === selectedUserIds[0]);
      return user ? `${user.first_name} ${user.last_name}` : '1 User';
    }
    return `${selectedUserIds.length} Users Selected`;
  };

  // If user has 'own' visibility, don't show filter at all
  if (visibilityLevel === 'own') {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-48 justify-between">
            {getDisplayText()}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading users...
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header with actions */}
              <div className="flex items-center justify-between p-3 border-b">
                <span className="font-medium">Select Assignees</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={selectedUserIds.length === profiles.length}
                  >
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={selectedUserIds.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* Selected users badges */}
              {selectedUserIds.length > 0 && (
                <div className="px-3 pb-2">
                  <div className="flex flex-wrap gap-1">
                    {selectedUserIds.slice(0, 3).map(userId => {
                      const user = profiles.find(p => p.id === userId);
                      return user ? (
                        <Badge key={userId} variant="secondary" className="text-xs">
                          {user.first_name} {user.last_name}
                          <X
                            className="h-3 w-3 ml-1 cursor-pointer"
                            onClick={() => handleUserToggle(userId)}
                          />
                        </Badge>
                      ) : null;
                    })}
                    {selectedUserIds.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedUserIds.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* User list */}
              <div className="max-h-60 overflow-y-auto">
                {visibilityLevel === 'all' && isAdmin && departments.length > 0 && (
                  <div className="space-y-2">
                    {departments.map(dept => (
                      <div key={dept.id} className="px-3">
                        <div className="font-medium text-sm text-muted-foreground mb-1">
                          {dept.name}
                        </div>
                        {dept.users.map(user => (
                          <div key={user.id} className="flex items-center space-x-2 py-1">
                            <Checkbox
                              id={user.id}
                              checked={selectedUserIds.includes(user.id)}
                              onCheckedChange={() => handleUserToggle(user.id)}
                            />
                            <label
                              htmlFor={user.id}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {user.first_name} {user.last_name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {(visibilityLevel !== 'all' || !isAdmin || departments.length === 0) && (
                  <div className="space-y-1 px-3">
                    {profiles.map(user => (
                      <div key={user.id} className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id={user.id}
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={() => handleUserToggle(user.id)}
                        />
                        <label
                          htmlFor={user.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {user.first_name} {user.last_name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {profiles.length === 0 && !loading && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No users available
                  </div>
                )}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}