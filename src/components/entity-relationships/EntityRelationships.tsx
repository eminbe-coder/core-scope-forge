import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Building2, User, History, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { CompanySelect, ContactSelect } from '@/components/ui/entity-select';
import { format } from 'date-fns';

interface RelationshipRole {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

interface EntityRelationship {
  id: string;
  relationship_role_id: string;
  company_id: string | null;
  contact_id: string | null;
  notes: string | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  relationship_roles: RelationshipRole;
  companies?: {
    id: string;
    name: string;
  };
  contacts?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface EntityRelationshipsProps {
  entityType: 'deal' | 'site' | 'lead_company' | 'lead_contact' | 'contract';
  entityId: string;
  title?: string;
  /** Show inactive relationships */
  showInactive?: boolean;
}

export function EntityRelationships({ 
  entityType, 
  entityId, 
  title = "Relationships",
  showInactive = false 
}: EntityRelationshipsProps) {
  const { currentTenant } = useTenant();
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [roles, setRoles] = useState<RelationshipRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showInactiveToggle, setShowInactiveToggle] = useState(showInactive);
  const [formData, setFormData] = useState({
    relationship_role_id: '',
    entity_type: 'company' as 'company' | 'contact',
    entity_id: '',
    notes: '',
  });

  useEffect(() => {
    if (currentTenant?.id && entityId) {
      fetchData();
    }
  }, [currentTenant?.id, entityId, showInactiveToggle]);

  const fetchData = async () => {
    if (!currentTenant?.id) return;

    try {
      // Fetch relationships with is_active filter
      let query = supabase
        .from('entity_relationships')
        .select(`
          *,
          relationship_roles (*),
          companies (id, name),
          contacts (id, first_name, last_name)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('start_date', { ascending: false });

      if (!showInactiveToggle) {
        query = query.eq('is_active', true);
      }

      const { data: relationshipsData, error: relationshipsError } = await query;

      if (relationshipsError) throw relationshipsError;

      // Fetch active roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('relationship_roles')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (rolesError) throw rolesError;

      setRelationships(relationshipsData || []);
      setRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load relationship data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id || !formData.relationship_role_id || !formData.entity_id) return;

    try {
      // Check if there's an existing active relationship for the same entity
      const { data: existing } = await supabase
        .from('entity_relationships')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq(formData.entity_type === 'company' ? 'company_id' : 'contact_id', formData.entity_id)
        .eq('is_active', true)
        .single();

      // If existing, deactivate it first (Employee Shift workflow)
      if (existing) {
        await supabase
          .from('entity_relationships')
          .update({ is_active: false })
          .eq('id', existing.id);
      }

      const relationshipData = {
        entity_type: entityType,
        entity_id: entityId,
        relationship_role_id: formData.relationship_role_id,
        tenant_id: currentTenant.id,
        notes: formData.notes.trim() || null,
        is_active: true,
        start_date: new Date().toISOString(),
        ...(formData.entity_type === 'company' 
          ? { company_id: formData.entity_id, contact_id: null }
          : { contact_id: formData.entity_id, company_id: null }
        )
      };

      const { error } = await supabase
        .from('entity_relationships')
        .insert(relationshipData);

      if (error) throw error;

      toast.success('Relationship added successfully');
      fetchData();
      resetForm();
    } catch (error) {
      console.error('Error adding relationship:', error);
      toast.error('Failed to add relationship');
    }
  };

  const handleDeactivate = async (relationshipId: string) => {
    if (!confirm('Deactivate this relationship? It will be marked as ended but preserved in history.')) return;

    try {
      const { error } = await supabase
        .from('entity_relationships')
        .update({ is_active: false })
        .eq('id', relationshipId);

      if (error) throw error;
      toast.success('Relationship deactivated');
      fetchData();
    } catch (error) {
      console.error('Error deactivating relationship:', error);
      toast.error('Failed to deactivate relationship');
    }
  };

  const handleReactivate = async (relationshipId: string) => {
    try {
      const { error } = await supabase
        .from('entity_relationships')
        .update({ 
          is_active: true, 
          end_date: null,
          start_date: new Date().toISOString() 
        })
        .eq('id', relationshipId);

      if (error) throw error;
      toast.success('Relationship reactivated');
      fetchData();
    } catch (error) {
      console.error('Error reactivating relationship:', error);
      toast.error('Failed to reactivate relationship');
    }
  };

  const handleDelete = async (relationshipId: string) => {
    if (!confirm('Permanently delete this relationship? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('entity_relationships')
        .delete()
        .eq('id', relationshipId);

      if (error) throw error;
      toast.success('Relationship removed');
      fetchData();
    } catch (error) {
      console.error('Error removing relationship:', error);
      toast.error('Failed to remove relationship');
    }
  };

  const resetForm = () => {
    setFormData({
      relationship_role_id: '',
      entity_type: 'company',
      entity_id: '',
      notes: '',
    });
    setIsDialogOpen(false);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      general: 'default',
      contractor: 'secondary',
      consultant: 'outline',
      design: 'default',
      client: 'secondary',
    };
    return colors[category] || 'default';
  };

  const getEntityName = (relationship: EntityRelationship) => {
    if (relationship.companies) {
      return relationship.companies.name;
    } else if (relationship.contacts) {
      return `${relationship.contacts.first_name} ${relationship.contacts.last_name}`.trim();
    }
    return 'Unknown';
  };

  if (loading) {
    return <div>Loading relationships...</div>;
  }

  const activeCount = relationships.filter(r => r.is_active).length;
  const inactiveCount = relationships.filter(r => !r.is_active).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {title}
              <Badge variant="secondary" className="ml-2">
                {activeCount} active
              </Badge>
            </CardTitle>
            <CardDescription>
              Companies and contacts linked to this record
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {inactiveCount > 0 && (
              <div className="flex items-center gap-2">
                <Switch
                  id="show-inactive"
                  checked={showInactiveToggle}
                  onCheckedChange={setShowInactiveToggle}
                />
                <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
                  <History className="h-4 w-4 inline mr-1" />
                  Show history ({inactiveCount})
                </Label>
              </div>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Relationship
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Relationship</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="role">Relationship Role</Label>
                    <Select 
                      value={formData.relationship_role_id} 
                      onValueChange={(value) => setFormData({ ...formData, relationship_role_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant={getCategoryColor(role.category)} className="text-xs">
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
                    <Label htmlFor="entity_type">Entity Type</Label>
                    <Select 
                      value={formData.entity_type} 
                      onValueChange={(value: 'company' | 'contact') => setFormData({ 
                        ...formData, 
                        entity_type: value, 
                        entity_id: '' 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="contact">Contact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="entity">
                      {formData.entity_type === 'company' ? 'Company' : 'Contact'}
                    </Label>
                    {formData.entity_type === 'company' ? (
                      <CompanySelect
                        value={formData.entity_id}
                        onValueChange={(value) => setFormData({ ...formData, entity_id: value })}
                        placeholder="Select a company"
                        showQuickAdd={true}
                      />
                    ) : (
                      <ContactSelect
                        value={formData.entity_id}
                        onValueChange={(value) => setFormData({ ...formData, entity_id: value })}
                        placeholder="Select a contact"
                        showQuickAdd={true}
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
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
                    <Button type="submit">Add Relationship</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {relationships.map((relationship) => (
              <TableRow 
                key={relationship.id}
                className={!relationship.is_active ? 'opacity-60' : ''}
              >
                <TableCell>
                  {relationship.is_active ? (
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <XCircle className="h-3 w-3 mr-1" />
                      Ended
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={getCategoryColor(relationship.relationship_roles.category)}>
                      {relationship.relationship_roles.category}
                    </Badge>
                    {relationship.relationship_roles.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {relationship.company_id ? (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    {getEntityName(relationship)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{format(new Date(relationship.start_date), 'MMM d, yyyy')}</div>
                    {relationship.end_date && (
                      <div className="text-muted-foreground">
                        → {format(new Date(relationship.end_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {relationship.notes || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {relationship.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(relationship.id)}
                        className="text-amber-600 hover:text-amber-700"
                        title="Deactivate (preserve history)"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReactivate(relationship.id)}
                        className="text-green-600 hover:text-green-700"
                        title="Reactivate"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(relationship.id)}
                      className="text-destructive hover:text-destructive"
                      title="Delete permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {relationships.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No relationships configured. Click "Add Relationship" to link companies or contacts.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
