import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Assignee {
  id: string;
  user_id: string;
  profiles: Profile;
}

interface MultiAssigneeManagerProps {
  todoId?: string;
  assignees: Assignee[];
  canEdit: boolean;
  onAssigneesChange: (assignees: Assignee[]) => void;
}

export const MultiAssigneeManager: React.FC<MultiAssigneeManagerProps> = ({
  todoId,
  assignees,
  canEdit,
  onAssigneesChange
}) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currentTenant } = useTenant();

  useEffect(() => {
    fetchProfiles();
  }, [currentTenant?.id]);

  const fetchProfiles = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', 
          await supabase
            .from('user_tenant_memberships')
            .select('user_id')
            .eq('tenant_id', currentTenant.id)
            .eq('active', true)
            .then(({ data }) => data?.map(m => m.user_id) || [])
        );

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleAddAssignee = async (profile: Profile) => {
    if (!canEdit || !currentTenant?.id) return;

    // Check if already assigned
    if (assignees.some(a => a.profiles.id === profile.id)) {
      return;
    }

    setLoading(true);
    try {
      if (todoId) {
        // Add to database if todo exists
        const { data, error } = await supabase
          .from('todo_assignees')
          .insert({
            todo_id: todoId,
            user_id: profile.id,
            tenant_id: currentTenant.id,
            assigned_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select(`
            id,
            user_id,
            profiles (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .single();

        if (error) throw error;

        const newAssignee = {
          id: data.id,
          user_id: data.user_id,
          profiles: data.profiles as any
        };

        onAssigneesChange([...assignees, newAssignee]);
      } else {
        // For new todos, just add to local state
        const newAssignee = {
          id: `temp-${Date.now()}`,
          user_id: profile.id,
          profiles: profile
        };
        onAssigneesChange([...assignees, newAssignee]);
      }

      setOpen(false);
      toast({
        title: "Success",
        description: `${profile.first_name} ${profile.last_name} added as assignee`,
      });
    } catch (error) {
      console.error('Error adding assignee:', error);
      toast({
        title: "Error",
        description: "Failed to add assignee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignee = async (assigneeId: string, userId: string) => {
    if (!canEdit) return;

    setLoading(true);
    try {
      if (todoId && !assigneeId.startsWith('temp-')) {
        // Remove from database if todo exists
        const { error } = await supabase
          .from('todo_assignees')
          .delete()
          .eq('id', assigneeId);

        if (error) throw error;
      }

      // Update local state
      const updatedAssignees = assignees.filter(a => a.id !== assigneeId);
      onAssigneesChange(updatedAssignees);

      const removedAssignee = assignees.find(a => a.id === assigneeId);
      toast({
        title: "Success",
        description: `${removedAssignee?.profiles.first_name} ${removedAssignee?.profiles.last_name} removed from assignees`,
      });
    } catch (error) {
      console.error('Error removing assignee:', error);
      toast({
        title: "Error",
        description: "Failed to remove assignee",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const availableProfiles = profiles.filter(
    profile => !assignees.some(a => a.profiles.id === profile.id)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Assignees</label>
        {canEdit && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                <Plus className="h-4 w-4 mr-1" />
                Add Assignee
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    {availableProfiles.map((profile) => (
                      <CommandItem
                        key={profile.id}
                        value={`${profile.first_name} ${profile.last_name} ${profile.email}`}
                        onSelect={() => handleAddAssignee(profile)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(profile.first_name, profile.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm">
                              {profile.first_name} {profile.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {profile.email}
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {assignees.map((assignee) => (
          <Badge
            key={assignee.id}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
          >
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-xs">
                {getInitials(assignee.profiles.first_name, assignee.profiles.last_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">
              {assignee.profiles.first_name} {assignee.profiles.last_name}
            </span>
            {canEdit && (
              <button
                onClick={() => handleRemoveAssignee(assignee.id, assignee.user_id)}
                disabled={loading}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {assignees.length === 0 && (
          <span className="text-sm text-muted-foreground">No assignees</span>
        )}
      </div>
    </div>
  );
};