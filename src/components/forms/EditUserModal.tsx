import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';
import { Trash2 } from 'lucide-react';

const editUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.string().min(1, 'Role is required'),
  custom_role_id: z.string().optional(),
  active: z.boolean(),
  password: z.string().optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: any;
}

interface Branch {
  id: string;
  name: string;
  city: string;
  country: string;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface UserMembership {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'super_admin' | 'admin' | 'member';
  custom_role_id?: string;
  active: boolean;
  user_profile?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  custom_role?: {
    id: string;
    name: string;
    description: string;
    permissions: any;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  membership: UserMembership | null;
  onSuccess: () => void;
  onDelete?: () => void;
}

export function EditUserModal({ open, onClose, membership, onSuccess, onDelete }: EditUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [currentAssignments, setCurrentAssignments] = useState({
    branch: null as string | null,
    departments: [] as string[]
  });
  const { toast } = useToast();

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      role: 'member',
      custom_role_id: undefined,
      active: true,
      password: '',
    },
  });

  // Fetch custom roles, branches, and departments for this tenant
  useEffect(() => {
    const fetchData = async () => {
      if (!membership?.tenant_id) return;
      
      try {
        const [rolesResult, branchesResult, departmentsResult] = await Promise.all([
          supabase
            .from('custom_roles')
            .select('*')
            .eq('tenant_id', membership.tenant_id)
            .eq('active', true)
            .order('name'),
          supabase
            .from('branches')
            .select('id, name, city, country')
            .eq('tenant_id', membership.tenant_id)
            .eq('active', true)
            .order('name'),
          supabase
            .from('departments')
            .select('id, name, description')
            .eq('tenant_id', membership.tenant_id)
            .eq('active', true)
            .order('name')
        ]);
        
        setCustomRoles(rolesResult.data || []);
        setBranches(branchesResult.data || []);
        setDepartments(departmentsResult.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (open && membership) {
      fetchData();
    }
  }, [open, membership]);

  // Reset form when membership changes
  useEffect(() => {
    const loadUserAssignments = async () => {
      if (membership?.user_profile && membership?.tenant_id) {
        // Determine current role value (custom role ID or system role)
        const currentRole = membership.custom_role_id || membership.role;
        
        form.reset({
          first_name: membership.user_profile.first_name || '',
          last_name: membership.user_profile.last_name || '',
          role: currentRole,
          custom_role_id: membership.custom_role_id,
          active: membership.active,
          password: '',
        });

        // Load current assignments
        try {
          const [branchResult, departmentResult] = await Promise.all([
            supabase
              .from('user_branch_assignments')
              .select('branch_id')
              .eq('user_id', membership.user_id)
              .eq('tenant_id', membership.tenant_id)
              .maybeSingle(),
            supabase
              .from('user_department_assignments')
              .select('department_id')
              .eq('user_id', membership.user_id)
              .eq('tenant_id', membership.tenant_id)
          ]);

          const currentBranch = branchResult.data?.branch_id || null;
          const currentDepartments = departmentResult.data?.map(d => d.department_id) || [];

          setCurrentAssignments({
            branch: currentBranch,
            departments: currentDepartments
          });
          setSelectedBranch(currentBranch || '');
          setSelectedDepartments(currentDepartments);
        } catch (error) {
          console.error('Error loading user assignments:', error);
        }
      }
    };

    loadUserAssignments();
  }, [membership, form]);

  const handleDelete = async () => {
    if (!membership) return;
    
    setIsDeleting(true);
    try {
      // Deactivate the user membership instead of hard delete
      const { error } = await supabase
        .from('user_tenant_memberships')
        .update({ active: false })
        .eq('id', membership.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User removed from tenant successfully',
      });

      onDelete?.();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove user',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const onSubmit = async (data: EditUserFormData) => {
    if (!membership) return;
    
    setIsLoading(true);
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
        })
        .eq('id', membership.user_id);

      if (profileError) throw profileError;

      // Determine if this is a custom role or system role
      const isCustomRole = customRoles.some(role => role.id === data.role);
      const updatePayload = isCustomRole 
        ? { role: 'member' as const, custom_role_id: data.role, active: data.active }
        : { role: data.role as 'super_admin' | 'admin' | 'member', custom_role_id: null, active: data.active };

      // Update membership role and status
      const { error: membershipError } = await supabase
        .from('user_tenant_memberships')
        .update(updatePayload)
        .eq('id', membership.id);

      if (membershipError) throw membershipError;

      // Update branch assignment
      if (selectedBranch !== currentAssignments.branch) {
        // Remove current assignment
        if (currentAssignments.branch) {
          await supabase
            .from('user_branch_assignments')
            .delete()
            .eq('user_id', membership.user_id)
            .eq('tenant_id', membership.tenant_id);
        }

        // Add new assignment
        if (selectedBranch) {
          const { error: branchError } = await supabase
            .from('user_branch_assignments')
            .insert({
              user_id: membership.user_id,
              branch_id: selectedBranch,
              tenant_id: membership.tenant_id,
            });

          if (branchError) throw branchError;
        }
      }

      // Update department assignments
      const departmentsToAdd = selectedDepartments.filter(d => !currentAssignments.departments.includes(d));
      const departmentsToRemove = currentAssignments.departments.filter(d => !selectedDepartments.includes(d));

      if (departmentsToRemove.length > 0) {
        await supabase
          .from('user_department_assignments')
          .delete()
          .eq('user_id', membership.user_id)
          .eq('tenant_id', membership.tenant_id)
          .in('department_id', departmentsToRemove);
      }

      if (departmentsToAdd.length > 0) {
        const { error: deptError } = await supabase
          .from('user_department_assignments')
          .insert(
            departmentsToAdd.map(deptId => ({
              user_id: membership.user_id,
              department_id: deptId,
              tenant_id: membership.tenant_id,
            }))
          );

        if (deptError) throw deptError;
      }

      // Update password via secure edge function if provided
      if (data.password && data.password.length >= 6) {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-reset-user-password', {
          body: {
            user_id: membership.user_id,
            tenant_id: membership.tenant_id,
            new_password: data.password,
          },
        });
        
        if (fnError) {
          console.warn('Password update failed:', fnError);
          // Don't throw error for password update failure, just warn
          toast({
            title: 'Partial Success',
            description: 'User details updated, but password update failed.',
            variant: 'default',
          });
        }
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Edit user error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!membership?.user_profile) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions for {membership.user_profile.email}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        {customRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name} (Custom)
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
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Active Status</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable user access
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="password" 
                        placeholder="Leave empty to keep current password" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-medium">Branch & Department Assignments</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch Assignment</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No branch assigned</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.city}, {branch.country})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Department Assignments</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                    {departments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No departments available</p>
                    ) : (
                      departments.map((department) => (
                        <div key={department.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dept-${department.id}`}
                            checked={selectedDepartments.includes(department.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDepartments([...selectedDepartments, department.id]);
                              } else {
                                setSelectedDepartments(selectedDepartments.filter(id => id !== department.id));
                              }
                            }}
                          />
                          <Label htmlFor={`dept-${department.id}`} className="text-sm">
                            {department.name}
                            {department.description && (
                              <span className="text-muted-foreground ml-1">
                                - {department.description}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading || isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove User
                </Button>
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Update User'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Remove User from Tenant"
        description={`Are you sure you want to remove ${membership?.user_profile?.first_name} ${membership?.user_profile?.last_name} from this tenant? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </>
  );
}
