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

const industrySchema = z.object({
  name: z.string().min(1, 'Industry name is required'),
  description: z.string().optional(),
});

type IndustryFormData = z.infer<typeof industrySchema>;

interface CompanyIndustry {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function CompanyIndustriesManager() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [industries, setIndustries] = useState<CompanyIndustry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<CompanyIndustry | null>(null);

  const form = useForm<IndustryFormData>({
    resolver: zodResolver(industrySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (currentTenant) {
      loadIndustries();
    }
  }, [currentTenant]);

  const loadIndustries = async () => {
    try {
      const { data, error } = await supabase
        .from('company_industries')
        .select('*')
        .eq('tenant_id', currentTenant?.id)
        .order('name');

      if (error) throw error;
      setIndustries(data || []);
    } catch (error: any) {
      console.error('Error loading industries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load company industries',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: IndustryFormData) => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      if (selectedIndustry) {
        // Update existing industry
        const { error } = await supabase
          .from('company_industries')
          .update({
            name: data.name,
            description: data.description || null,
          })
          .eq('id', selectedIndustry.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Company industry updated successfully',
        });
      } else {
        // Create new industry
        const { error } = await supabase
          .from('company_industries')
          .insert({
            name: data.name,
            description: data.description || null,
            tenant_id: currentTenant.id,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Company industry created successfully',
        });
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedIndustry(null);
      form.reset();
      loadIndustries();
    } catch (error: any) {
      console.error('Error saving industry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save company industry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (industryId: string) => {
    try {
      const { error } = await supabase
        .from('company_industries')
        .delete()
        .eq('id', industryId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Company industry deleted successfully',
      });

      loadIndustries();
    } catch (error: any) {
      console.error('Error deleting industry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete company industry',
        variant: 'destructive',
      });
    }
  };

  const toggleIndustryStatus = async (industryId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('company_industries')
        .update({ active: !currentStatus })
        .eq('id', industryId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Company industry ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });

      loadIndustries();
    } catch (error: any) {
      console.error('Error updating industry status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update industry status',
        variant: 'destructive',
      });
    }
  };

  const openEditModal = (industry: CompanyIndustry) => {
    setSelectedIndustry(industry);
    form.reset({
      name: industry.name,
      description: industry.description || '',
    });
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    setSelectedIndustry(null);
    form.reset({
      name: '',
      description: '',
    });
    setShowCreateModal(true);
  };

  const IndustryForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter industry name" {...field} />
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
                <Textarea placeholder="Enter industry description" {...field} />
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
              setSelectedIndustry(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {selectedIndustry ? 'Update Industry' : 'Create Industry'}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Company Industries</CardTitle>
          <CardDescription>
            Manage company industries for your organization
          </CardDescription>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Add Industry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Company Industry</DialogTitle>
              <DialogDescription>
                Add a new industry category for companies
              </DialogDescription>
            </DialogHeader>
            <IndustryForm />
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
            {industries.map((industry) => (
              <TableRow key={industry.id}>
                <TableCell>
                  <div className="font-medium">{industry.name}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {industry.description || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={industry.active}
                      onCheckedChange={() => toggleIndustryStatus(industry.id, industry.active)}
                    />
                    <span className="text-sm">
                      {industry.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(industry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(industry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {industries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="text-muted-foreground">
                    No company industries configured. Create your first industry to get started.
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
            <DialogTitle>Edit Company Industry</DialogTitle>
            <DialogDescription>
              Update the company industry information
            </DialogDescription>
          </DialogHeader>
          <IndustryForm />
        </DialogContent>
      </Dialog>
    </Card>
  );
}