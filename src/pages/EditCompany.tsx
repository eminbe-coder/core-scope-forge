import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, Plus, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Activities from '@/pages/Activities';
import Todos from '@/pages/Todos';
import { CompanyActivities } from '@/components/company/CompanyActivities';
import { CompanyTodos } from '@/components/company/CompanyTodos';
import { CompanyGlobalRelationships } from '@/components/company/CompanyGlobalRelationships';

interface Company {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  headquarters?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  notes?: string;
  active: boolean;
  is_lead?: boolean;
  linkedin_page?: string;
  instagram_page?: string;
  created_at: string;
  updated_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
}

interface CompanyContact {
  id: string;
  contact_id: string;
  company_id: string;
  position?: string;
  department?: string;
  is_primary: boolean;
  notes?: string;
  contact: Contact;
}

interface ContactConflict {
  contact: Contact;
  currentCompany: { id: string; name: string };
}

export default function EditCompany() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyContacts, setCompanyContacts] = useState<CompanyContact[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    conflict: ContactConflict | null;
    targetContactId: string | null;
  }>({ open: false, conflict: null, targetContactId: null });

  useEffect(() => {
    if (id && currentTenant) {
      fetchCompany();
      fetchCompanyContacts();
      fetchAvailableContacts();
    }
  }, [id, currentTenant]);

  const fetchCompany = async () => {
    if (!id || !currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', currentTenant.id)
        .single();

      if (error) throw error;
      setCompany(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyContacts = async () => {
    if (!id || !currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('company_contacts')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('company_id', id);

      if (error) throw error;
      setCompanyContacts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching contacts',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchAvailableContacts = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setAvailableContacts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error fetching available contacts',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const logActivity = async (action: string, description: string, oldValues?: any, newValues?: any) => {
    if (!user || !currentTenant || !company) return;

    try {
      await supabase.from('activity_logs').insert({
        tenant_id: currentTenant.id,
        entity_type: 'company',
        entity_id: company.id,
        activity_type: action,
        title: `Company ${action}`,
        description,
        created_by: user.id,
        ...(oldValues && { old_values: oldValues }),
        ...(newValues && { new_values: newValues }),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleSave = async () => {
    if (!company || !currentTenant || !user) return;

    setSaving(true);
    try {
      const oldValues = { ...company };
      const { error } = await supabase
        .from('companies')
        .update(company)
        .eq('id', company.id);

      if (error) throw error;

      await logActivity('updated', `Company "${company.name}" was updated`, oldValues, company);

      toast({
        title: 'Success',
        description: 'Company updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const checkContactConflict = async (contactId: string): Promise<ContactConflict | null> => {
    try {
      const { data, error } = await supabase
        .from('company_contacts')
        .select(`
          contact_id,
          company:companies(id, name),
          contact:contacts(*)
        `)
        .eq('contact_id', contactId)
        .neq('company_id', id);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const existing = data[0];
        return {
          contact: existing.contact,
          currentCompany: existing.company,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking contact conflict:', error);
      return null;
    }
  };

  const handleAddContact = async (contactId: string) => {
    const conflict = await checkContactConflict(contactId);
    
    if (conflict) {
      setConflictDialog({
        open: true,
        conflict,
        targetContactId: contactId,
      });
      return;
    }

    await addContactToCompany(contactId);
  };

  const addContactToCompany = async (contactId: string, moveFromOther = false) => {
    if (!company || !currentTenant || !user) return;

    try {
      // If moving from another company, remove the old association first
      if (moveFromOther) {
        await supabase
          .from('company_contacts')
          .delete()
          .eq('contact_id', contactId);
      }

      const { error } = await supabase
        .from('company_contacts')
        .insert({
          company_id: company.id,
          contact_id: contactId,
          is_primary: companyContacts.length === 0,
        });

      if (error) throw error;

      const contact = availableContacts.find(c => c.id === contactId);
      await logActivity(
        'contact_added',
        `Contact "${contact?.first_name} ${contact?.last_name}" was ${moveFromOther ? 'moved to' : 'added to'} company "${company.name}"`
      );

      await fetchCompanyContacts();
      
      toast({
        title: 'Success',
        description: `Contact ${moveFromOther ? 'moved to' : 'added to'} company successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveContact = async (companyContactId: string, contactName: string) => {
    if (!company || !user) return;

    try {
      const { error } = await supabase
        .from('company_contacts')
        .delete()
        .eq('id', companyContactId);

      if (error) throw error;

      await logActivity('contact_removed', `Contact "${contactName}" was removed from company "${company.name}"`);
      await fetchCompanyContacts();

      toast({
        title: 'Success',
        description: 'Contact removed from company successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const confirmMoveContact = async () => {
    if (!conflictDialog.targetContactId) return;
    
    await addContactToCompany(conflictDialog.targetContactId, true);
    setConflictDialog({ open: false, conflict: null, targetContactId: null });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!company) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Company not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const availableContactsFiltered = availableContacts.filter(
    contact => !companyContacts.some(cc => cc.contact_id === contact.id)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
              ← Back to Companies
            </Button>
            <Building className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{company.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Company Details</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({companyContacts.length})</TabsTrigger>
            <TabsTrigger value="relationships">360° Relationships</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="todos">To-Do</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={company.industry || ''}
                      onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                      placeholder="e.g., Technology, Healthcare"
                    />
                  </div>
                  <div>
                    <Label htmlFor="size">Company Size</Label>
                    <Select
                      value={company.size || ''}
                      onValueChange={(value) => setCompany({ ...company, size: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501-1000">501-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="headquarters">Headquarters</Label>
                    <Input
                      id="headquarters"
                      value={company.headquarters || ''}
                      onChange={(e) => setCompany({ ...company, headquarters: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={company.description || ''}
                    onChange={(e) => setCompany({ ...company, description: e.target.value })}
                    placeholder="Brief description of the company"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={company.website || ''}
                      onChange={(e) => setCompany({ ...company, website: e.target.value })}
                      placeholder="https://company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={company.email || ''}
                      onChange={(e) => setCompany({ ...company, email: e.target.value })}
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={company.phone || ''}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedin">LinkedIn Page</Label>
                    <Input
                      id="linkedin"
                      value={company.linkedin_page || ''}
                      onChange={(e) => setCompany({ ...company, linkedin_page: e.target.value })}
                      placeholder="https://linkedin.com/company/..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={company.notes || ''}
                    onChange={(e) => setCompany({ ...company, notes: e.target.value })}
                    placeholder="Internal notes about this company"
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Company Contacts
                  <Select onValueChange={handleAddContact}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Add contact to company" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContactsFiltered.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                          {contact.email && ` (${contact.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {companyContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No contacts associated with this company yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {companyContacts.map((cc) => (
                      <div key={cc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {cc.contact.first_name} {cc.contact.last_name}
                            </h4>
                            {cc.is_primary && (
                              <Badge variant="default">Primary</Badge>
                            )}
                          </div>
                          {cc.contact.email && (
                            <p className="text-sm text-muted-foreground">{cc.contact.email}</p>
                          )}
                          {cc.contact.phone && (
                            <p className="text-sm text-muted-foreground">{cc.contact.phone}</p>
                          )}
                          {cc.position && (
                            <p className="text-sm text-muted-foreground">Position: {cc.position}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveContact(cc.id, `${cc.contact.first_name} ${cc.contact.last_name}`)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relationships">
            <CompanyGlobalRelationships companyId={company.id} companyName={company.name} />
          </TabsContent>

          <TabsContent value="activities">
            <CompanyActivities companyId={company.id} />
          </TabsContent>

          <TabsContent value="todos">
            <CompanyTodos companyId={company.id} />
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog 
        open={conflictDialog.open} 
        onOpenChange={(open) => !open && setConflictDialog({ open: false, conflict: null, targetContactId: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Contact Already Associated
            </AlertDialogTitle>
            <AlertDialogDescription>
              {conflictDialog.conflict && (
                <>
                  The contact <strong>{conflictDialog.conflict.contact.first_name} {conflictDialog.conflict.contact.last_name}</strong> is already associated with <strong>{conflictDialog.conflict.currentCompany.name}</strong>.
                  <br /><br />
                  Do you want to move this contact to <strong>{company.name}</strong>? This will remove their association with the current company.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMoveContact}>
              Move Contact
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}