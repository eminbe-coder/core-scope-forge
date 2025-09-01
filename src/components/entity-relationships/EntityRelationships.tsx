import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Trash2, Building2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { UnifiedEntitySelect } from '@/components/ui/unified-entity-select';

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
  entityType: 'deal' | 'site' | 'lead_company' | 'lead_contact';
  entityId: string;
  title?: string;
}

export function EntityRelationships({ entityType, entityId, title = "Relationships" }: EntityRelationshipsProps) {
  const { currentTenant } = useTenant();
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [roles, setRoles] = useState<RelationshipRole[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; }>>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string; last_name: string; }>>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
  }, [currentTenant?.id, entityId]);

  const fetchData = async () => {
    if (!currentTenant?.id) return;

    try {
      // Fetch relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('entity_relationships')
        .select(`
          *,
          relationship_roles (*),
          companies (id, name),
          contacts (id, first_name, last_name)
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

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

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name', { ascending: true });

      if (companiesError) throw companiesError;

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('first_name', { ascending: true });

      if (contactsError) throw contactsError;

      setRelationships(relationshipsData || []);
      setRoles(rolesData || []);
      setCompanies(companiesData || []);
      setContacts(contactsData || []);
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
      const relationshipData = {
        entity_type: entityType,
        entity_id: entityId,
        relationship_role_id: formData.relationship_role_id,
        tenant_id: currentTenant.id,
        notes: formData.notes.trim() || null,
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

  const handleDelete = async (relationshipId: string) => {
    if (!confirm('Are you sure you want to remove this relationship?')) return;

    try {
      const { error } = await supabase
        .from('entity_relationships')
        .delete()
        .eq('id', relationshipId);

      if (error) throw error;
      toast.success('Relationship removed successfully');
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
    const colors = {
      general: 'default',
      contractor: 'secondary',
      consultant: 'outline',
      design: 'default',
      client: 'secondary',
    };
    return colors[category as keyof typeof colors] || 'default';
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Companies and contacts linked to this record
            </CardDescription>
          </div>
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
                  <Select value={formData.relationship_role_id} onValueChange={(value) => setFormData({ ...formData, relationship_role_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
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
                  <Label htmlFor="entity_type">Entity Type</Label>
                  <Select value={formData.entity_type} onValueChange={(value: 'company' | 'contact') => setFormData({ ...formData, entity_type: value, entity_id: '' })}>
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
                  <Select value={formData.entity_id} onValueChange={(value) => setFormData({ ...formData, entity_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select a ${formData.entity_type}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.entity_type === 'company' ? companies : contacts).map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {'name' in entity ? entity.name : `${entity.first_name} ${entity.last_name}`.trim()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {relationships.map((relationship) => (
              <TableRow key={relationship.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={getCategoryColor(relationship.relationship_roles.category) as any}>
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
                <TableCell>{relationship.notes || '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(relationship.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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