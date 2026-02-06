import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UniversalCompanyModal } from '@/components/modals/UniversalCompanyModal';
import { UniversalContactModal } from '@/components/modals/UniversalContactModal';
import { toast } from 'sonner';
import { Plus, Trash2, Building2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useDynamicCompanies, useDynamicContacts } from '@/hooks/use-dynamic-entities';

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

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

export interface EntityRelationship {
  entity_type: 'company' | 'contact';
  entity_id: string;
  entity_name: string;
  relationship_role_id: string;
  relationship_role_name: string;
  relationship_category: string;
  notes?: string;
}

interface EntityRelationshipSelectorProps {
  relationships: EntityRelationship[];
  onChange: (relationships: EntityRelationship[]) => void;
  title?: string;
  description?: string;
}

export function EntityRelationshipSelector({ 
  relationships, 
  onChange, 
  title = "Entity Relationships",
  description = "Add companies or contacts with their specific roles (e.g., Consultant, Contractor, etc.)"
}: EntityRelationshipSelectorProps) {
  const { currentTenant } = useTenant();
  const [roles, setRoles] = useState<RelationshipRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [formData, setFormData] = useState({
    entity_type: '' as 'company' | 'contact' | '',
    entity_id: '',
    relationship_role_id: '',
    notes: '',
  });

  // Load all companies and contacts without search limit
  const { companies } = useDynamicCompanies({ limit: 1000 });
  const { contacts } = useDynamicContacts({ limit: 1000 });

  useEffect(() => {
    if (currentTenant?.id) {
      fetchRoles();
    }
  }, [currentTenant?.id]);

  const fetchRoles = async () => {
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
      setRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load relationship roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entity_id || !formData.relationship_role_id || !formData.entity_type) return;

    const role = roles.find(r => r.id === formData.relationship_role_id);
    if (!role) return;

    let entityName = '';
    if (formData.entity_type === 'company') {
      const company = companies.find(c => c.id === formData.entity_id);
      entityName = company?.name || '';
    } else {
      const contact = contacts.find(c => c.id === formData.entity_id);
      entityName = contact ? `${contact.first_name} ${contact.last_name}` : '';
    }

    if (!entityName) return;

    // Check if this entity-role combination already exists
    const exists = relationships.some(rel => 
      rel.entity_id === formData.entity_id && 
      rel.relationship_role_id === formData.relationship_role_id
    );

    if (exists) {
      toast.error('This entity-role combination already exists');
      return;
    }

    const newRelationship: EntityRelationship = {
      entity_type: formData.entity_type,
      entity_id: formData.entity_id,
      entity_name: entityName,
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
    setFormData(prev => ({ 
      ...prev, 
      entity_type: 'company',
      entity_id: company.id 
    }));
    setShowCompanyModal(false);
    toast.success('Company added successfully');
  };

  const handleContactCreated = (contact: { id: string; first_name: string; last_name: string }) => {
    setFormData(prev => ({ 
      ...prev, 
      entity_type: 'contact',
      entity_id: contact.id 
    }));
    setShowContactModal(false);
    toast.success('Contact added successfully');
  };

  const resetForm = () => {
    setFormData({
      entity_type: '',
      entity_id: '',
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

  const selectedCompany = formData.entity_type === 'company' && formData.entity_id ? 
    companies.find(c => c.id === formData.entity_id) : null;
  const selectedContact = formData.entity_type === 'contact' && formData.entity_id ? 
    contacts.find(c => c.id === formData.entity_id) : null;

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
                Add Relationship
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Entity Relationship</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="entity-type">Entity Type</Label>
                  <Select value={formData.entity_type} onValueChange={(value: 'company' | 'contact') => setFormData({ ...formData, entity_type: value, entity_id: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="contact">Contact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.entity_type === 'company' && (
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Select value={formData.entity_id} onValueChange={(value) => setFormData({ ...formData, entity_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50 max-h-[200px] overflow-y-auto">
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {company.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCompanyModal(true)}
                      className="mt-2"
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Add Company
                    </Button>
                  </div>
                )}

                {formData.entity_type === 'contact' && (
                  <div>
                    <Label htmlFor="contact">Contact</Label>
                    <Select value={formData.entity_id} onValueChange={(value) => setFormData({ ...formData, entity_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50 max-h-[200px] overflow-y-auto">
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {contact.first_name} {contact.last_name}
                              {contact.email && (
                                <span className="text-muted-foreground text-sm">({contact.email})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowContactModal(true)}
                      className="mt-2"
                    >
                      <User className="h-4 w-4 mr-1" />
                      Add Contact
                    </Button>
                  </div>
                )}

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
                  <Button type="submit" disabled={!formData.entity_id || !formData.relationship_role_id}>
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
                <TableHead>Entity</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relationships.map((relationship, index) => (
                <TableRow key={`${relationship.entity_id}-${relationship.relationship_role_id}-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {relationship.entity_type === 'company' ? (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div>{relationship.entity_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {relationship.entity_type}
                        </div>
                      </div>
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
            No relationships added yet. Click "Add Relationship" to link companies or contacts with specific roles.
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

      <UniversalCompanyModal
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        onCompanyCreated={handleCompanyCreated}
      />

      <UniversalContactModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
        onContactCreated={handleContactCreated}
      />
    </Card>
  );
}