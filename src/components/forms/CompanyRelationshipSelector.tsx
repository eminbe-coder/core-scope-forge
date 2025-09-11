import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DynamicCompanySelect } from '@/components/ui/dynamic-searchable-select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuickAddCompanyModal } from '@/components/modals/QuickAddCompanyModal';
import { toast } from 'sonner';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';

interface RelationshipRole {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

interface Company {
  id: string;
  name: string;
}

export interface CompanyRelationship {
  company_id: string;
  company_name: string;
  relationship_role_id: string;
  relationship_role_name: string;
  relationship_category: string;
  notes?: string;
}

interface CompanyRelationshipSelectorProps {
  relationships: CompanyRelationship[];
  onChange: (relationships: CompanyRelationship[]) => void;
  title?: string;
  description?: string;
}

export function CompanyRelationshipSelector({ 
  relationships, 
  onChange, 
  title = "Company Relationships",
  description = "Add companies with their specific roles (e.g., Consultant, Contractor, etc.)"
}: CompanyRelationshipSelectorProps) {
  const { currentTenant } = useTenant();
  const [roles, setRoles] = useState<RelationshipRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '',
    relationship_role_id: '',
    notes: '',
  });

  useEffect(() => {
    if (currentTenant?.id) {
      fetchData();
    }
  }, [currentTenant?.id]);

  const fetchData = async () => {
    if (!currentTenant?.id) return;

    try {
      // Fetch active roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('relationship_roles')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (rolesError) throw rolesError;

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name', { ascending: true });

      if (companiesError) throw companiesError;

      setRoles(rolesData || []);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load relationship data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_id || !formData.relationship_role_id) return;

    const company = companies.find(c => c.id === formData.company_id);
    const role = roles.find(r => r.id === formData.relationship_role_id);
    
    if (!company || !role) return;

    // Check if this company-role combination already exists
    const exists = relationships.some(rel => 
      rel.company_id === formData.company_id && 
      rel.relationship_role_id === formData.relationship_role_id
    );

    if (exists) {
      toast.error('This company-role combination already exists');
      return;
    }

    const newRelationship: CompanyRelationship = {
      company_id: formData.company_id,
      company_name: company.name,
      relationship_role_id: formData.relationship_role_id,
      relationship_role_name: role.name,
      relationship_category: role.category,
      notes: formData.notes.trim() || undefined,
    };

    onChange([...relationships, newRelationship]);
    resetForm();
  };

  const handleRemove = (index: number) => {
    const updated = relationships.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleCompanyCreated = (company: { id: string; name: string }) => {
    setCompanies(prev => [...prev, company]);
    setFormData(prev => ({ ...prev, company_id: company.id }));
    setShowCompanyModal(false);
    toast.success('Company added successfully');
  };

  const resetForm = () => {
    setFormData({
      company_id: '',
      relationship_role_id: '',
      notes: '',
    });
    setIsDialogOpen(false);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'default',
      contractor: 'secondary',
      consultant: 'outline',
      design: 'default',
      client: 'secondary',
    };
    return colors[category as keyof typeof colors] || 'default';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">
              {description}
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Company Relationship</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="company">Company</Label>
                  <DynamicCompanySelect
                    value={formData.company_id}
                    onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                    placeholder="Select a company"
                    searchPlaceholder="Search companies..."
                    emptyText="No companies found"
                    onAddNew={() => setShowCompanyModal(true)}
                    addNewLabel="Add Company"
                  />
                </div>

                <div>
                  <Label htmlFor="role">Relationship Role</Label>
                  <Select value={formData.relationship_role_id} onValueChange={(value) => setFormData({ ...formData, relationship_role_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant={getCategoryColor(role.category) as any} className="text-xs">
                              {role.category}
                            </Badge>
                            {role.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes about this relationship"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!formData.company_id || !formData.relationship_role_id}>
                    Add Relationship
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {relationships.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relationships.map((relationship, index) => (
                <TableRow key={`${relationship.company_id}-${relationship.relationship_role_id}-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {relationship.company_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={getCategoryColor(relationship.relationship_category) as any}>
                        {relationship.relationship_category}
                      </Badge>
                      {relationship.relationship_role_name}
                    </div>
                  </TableCell>
                  <TableCell>{relationship.notes || '-'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No companies added yet. Click "Add Company" to link companies with specific roles.
          </div>
        )}

        {roles.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">
              No relationship roles configured.
            </p>
            <p className="text-xs text-muted-foreground">
              Go to Settings → Relationship Roles to create roles like "Consultant", "Contractor", etc.
            </p>
          </div>
        )}
      </CardContent>

      <QuickAddCompanyModal
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onCompanyCreated={handleCompanyCreated}
      />
    </Card>
  );
}