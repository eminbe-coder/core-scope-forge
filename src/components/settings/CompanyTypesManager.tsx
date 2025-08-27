import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const typeSchema = z.object({
  name: z.string().min(1, 'Company type name is required'),
  description: z.string().optional(),
});

type TypeFormData = z.infer<typeof typeSchema>;

interface CompanyType {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function CompanyTypesManager() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [types, setTypes] = useState<CompanyType[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedType, setSelectedType] = useState<CompanyType | null>(null);

  const form = useForm<TypeFormData>({
    resolver: zodResolver(typeSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (currentTenant) {
      loadTypes();
    }
  }, [currentTenant]);

  const loadTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('company_types')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('name');

      if (error) throw error;
      setTypes(data || []);
    } catch (error: any) {
      console.error('Error loading company types:', error);
      toast({
        title: 'Error',
        description: 'Failed to load company types',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: TypeFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      if (selectedType) {
        // Update existing type
        const { error } = await supabase
          .from('company_types')
          .update({
            name: data.name,
            description: data.description || null,
          })
          .eq('id', selectedType.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Company type updated successfully',
        });
      } else {
        // Create new type
        const { error } = await supabase
          .from('company_types')
          .insert({
            name: data.name,
            description: data.description || null,
            tenant_id: currentTenant.id,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Company type created successfully',
        });
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedType(null);
      form.reset();
      loadTypes();
    } catch (error: any) {
      console.error('Error saving company type:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save company type',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (typeId: string) => {
    try {
      const { error } = await supabase
        .from('company_types')
        .delete()
        .eq('id', typeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Company type deleted successfully',
      });

      loadTypes();
    } catch (error: any) {
      console.error('Error deleting company type:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete company type',
        variant: 'destructive',
      });
    }
  };

  const toggleTypeStatus = async (typeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('company_types')
        .update({ active: !currentStatus })
        .eq('id', typeId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Company type ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      loadTypes();
    } catch (error: any) {
      console.error('Error updating company type status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update company type status',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (type: CompanyType) => {
    setSelectedType(type);
    form.reset({
      name: type.name,
      description: type.description || '',
    });
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setSelectedType(null);
    form.reset({
      name: '',
      description: '',
    });
    setShowCreateModal(true);
  };

  const TypeForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Type Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter company type name" {...field} />
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
                <Textarea placeholder="Enter company type description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedType(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {selectedType ? 'Update Type' : 'Create Type'}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Company Types</CardTitle>
          <CardDescription>
            Manage company types for your organization
          </CardDescription>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Company Type</DialogTitle>
              <DialogDescription>
                Add a new type category for companies
              </DialogDescription>
            </DialogHeader>
            <TypeForm />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type) => (
              <TableRow key={type.id}>
                <TableCell>
                  <div className="font-medium">{type.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {type.description || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={type.active}
                      onCheckedChange={() => toggleTypeStatus(type.id, type.active)}
                    />
                    <span className="text-sm">
                      {type.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(type)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {types.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="text-muted-foreground">
                    No company types configured. Create your first type to get started.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company Type</DialogTitle>
            <DialogDescription>
              Update the company type information
            </DialogDescription>
          </DialogHeader>
          <TypeForm />
        </DialogContent>
      </Dialog>
    </Card>
  );
}