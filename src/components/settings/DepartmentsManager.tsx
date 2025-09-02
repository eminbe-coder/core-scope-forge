import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';

const departmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  branch_id: z.string().optional(),
});

type Department = {
  id: string;
  name: string;
  description: string | null;
  branch_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  branches?: {
    name: string;
  };
};

type Branch = {
  id: string;
  name: string;
  city: string;
  country: string;
};

type DepartmentFormData = z.infer<typeof departmentSchema>;

export function DepartmentsManager() {
  const { currentTenant } = useTenant();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
      branch_id: 'no-branch',
    },
  });

  const loadDepartments = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('departments')
        .select(`
          *,
          branches (
            name
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const loadBranches = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, city, country')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadDepartments(), loadBranches()]);
      setLoading(false);
    };
    loadData();
  }, [currentTenant]);

  const onSubmit = async (data: DepartmentFormData) => {
    if (!currentTenant) return;

    try {
      const payload = {
        name: data.name,
        description: data.description || null,
        branch_id: data.branch_id === 'no-branch' ? null : data.branch_id,
        tenant_id: currentTenant.id,
      };

      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDepartment.id);

        if (error) throw error;
        toast.success('Department updated successfully');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([payload]);

        if (error) throw error;
        toast.success('Department created successfully');
      }

      setIsModalOpen(false);
      setEditingDepartment(null);
      form.reset();
      loadDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error('Failed to save department');
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    form.reset({
      name: department.name,
      description: department.description || '',
      branch_id: department.branch_id || 'no-branch',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!departmentToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('departments')
        .update({ active: false })
        .eq('id', departmentToDelete.id);

      if (error) throw error;

      toast.success('Department deleted successfully');
      setDeleteModalOpen(false);
      setDepartmentToDelete(null);
      loadDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Failed to delete department');
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateModal = () => {
    setEditingDepartment(null);
    form.reset();
    setIsModalOpen(true);
  };

  if (loading) {
    return <div>Loading departments...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Departments Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Create and manage departments within your organization.
          </p>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingDepartment ? 'Edit Department' : 'Create New Department'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="branch_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            <SelectItem value="no-branch">No branch assigned</SelectItem>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name} ({branch.city}, {branch.country})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingDepartment ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {departments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No departments found. Create your first department to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>{department.description || '-'}</TableCell>
                  <TableCell>{department.branches?.name || 'No branch'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(department)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDepartmentToDelete(department);
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DeleteConfirmationModal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Department"
          description={`Are you sure you want to delete "${departmentToDelete?.name}"? This action cannot be undone.`}
          isDeleting={isDeleting}
        />
      </CardContent>
    </Card>
  );
}