import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelectDropdown } from '@/components/deals/MultiSelectDropdown';
import { DollarSign, Calendar, Building, MapPin, Percent, Edit3, Save, X, Users, User, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';

interface DealStage {
  id: string;
  name: string;
  win_percentage: number;
}

interface Site {
  id: string;
  name: string;
  address: string;
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

interface Deal {
  id: string;
  name: string;
  description?: string;
  value?: number;
  status: string;
  stage_id?: string;
  site_id?: string;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
  customers?: {
    name: string;
  };
  sites?: {
    name: string;
  };
  currencies?: {
    symbol: string;
  };
  created_at: string;
  updated_at: string;
}

interface DealInfoProps {
  deal: Deal;
  onUpdate: () => void;
}

export const DealInfo = ({ deal, onUpdate }: DealInfoProps) => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [stages, setStages] = useState<DealStage[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [linkedCompanies, setLinkedCompanies] = useState<Company[]>([]);
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editedDeal, setEditedDeal] = useState({
    stage_id: deal.stage_id || '',
    value: deal.value || 0,
    expected_close_date: deal.expected_close_date || '',
    site_id: deal.site_id || '',
    company_ids: [] as string[],
    contact_ids: [] as string[],
  });

  const fetchStages = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('deal_stages')
        .select('id, name, win_percentage')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('sort_order');

      if (error) throw error;
      setStages(data || []);
    } catch (error) {
      console.error('Error fetching deal stages:', error);
    }
  };

  const fetchSites = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, address')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchCompanies = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchContacts = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', currentTenant.id)
        .eq('active', true)
        .order('first_name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchLinkedEntities = async () => {
    if (!deal.id) return;

    try {
      // Fetch linked companies
      const { data: companyData, error: companyError } = await supabase
        .from('deal_companies')
        .select(`
          companies(id, name)
        `)
        .eq('deal_id', deal.id);

      if (companyError) throw companyError;
      const linkedCompaniesData = companyData?.map(dc => dc.companies).filter(Boolean) || [];
      setLinkedCompanies(linkedCompaniesData as Company[]);

      // Fetch linked contacts
      const { data: contactData, error: contactError } = await supabase
        .from('deal_contacts')
        .select(`
          contacts(id, first_name, last_name, email)
        `)
        .eq('deal_id', deal.id);

      if (contactError) throw contactError;
      const linkedContactsData = contactData?.map(dc => dc.contacts).filter(Boolean) || [];
      setLinkedContacts(linkedContactsData as Contact[]);

      // Update edited deal with current linked IDs
      setEditedDeal(prev => ({
        ...prev,
        company_ids: linkedCompaniesData.map(c => c?.id || ''),
        contact_ids: linkedContactsData.map(c => c?.id || ''),
      }));
    } catch (error) {
      console.error('Error fetching linked entities:', error);
    }
  };

  useEffect(() => {
    fetchStages();
    fetchSites();
    fetchCompanies();
    fetchContacts();
    fetchLinkedEntities();
  }, [currentTenant, deal.id]);

  const getCurrentStage = () => {
    return stages.find(stage => stage.id === deal.stage_id);
  };

  const logActivity = async (changes: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentTenant) return;

      await supabase
        .from('activities')
        .insert({
          tenant_id: currentTenant.id,
          deal_id: deal.id,
          type: 'note',
          title: 'Deal Updated',
          description: `Deal information updated: ${changes.join(', ')}`,
          created_by: user.id,
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    try {
      const changes: string[] = [];
      
      // Check what changed
      if (editedDeal.stage_id !== deal.stage_id) {
        const newStage = stages.find(s => s.id === editedDeal.stage_id);
        const oldStage = getCurrentStage();
        changes.push(`Stage changed from "${oldStage?.name || 'None'}" to "${newStage?.name || 'None'}"`);
      }
      
      if (editedDeal.value !== deal.value) {
        changes.push(`Value changed from ${deal.currencies?.symbol || '$'}${deal.value?.toLocaleString() || 0} to ${deal.currencies?.symbol || '$'}${editedDeal.value.toLocaleString()}`);
      }
      
      if (editedDeal.expected_close_date !== deal.expected_close_date) {
        const oldDate = deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'Not set';
        const newDate = editedDeal.expected_close_date ? new Date(editedDeal.expected_close_date).toLocaleDateString() : 'Not set';
        changes.push(`Expected close date changed from ${oldDate} to ${newDate}`);
      }

      if (editedDeal.site_id !== deal.site_id) {
        const oldSite = sites.find(s => s.id === deal.site_id);
        const newSite = sites.find(s => s.id === editedDeal.site_id);
        changes.push(`Site changed from "${oldSite?.name || 'None'}" to "${newSite?.name || 'None'}"`);
      }

      // Update deal
      const { error } = await supabase
        .from('deals')
        .update({
          stage_id: editedDeal.stage_id || null,
          value: editedDeal.value,
          expected_close_date: editedDeal.expected_close_date || null,
          site_id: editedDeal.site_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deal.id);

      if (error) throw error;

      // Update company relationships
      await supabase.from('deal_companies').delete().eq('deal_id', deal.id);
      
      if (editedDeal.company_ids.length > 0) {
        const companyInserts = editedDeal.company_ids.map(companyId => ({
          deal_id: deal.id,
          company_id: companyId,
        }));
        await supabase.from('deal_companies').insert(companyInserts);
      }

      // Update contact relationships
      await supabase.from('deal_contacts').delete().eq('deal_id', deal.id);
      
      if (editedDeal.contact_ids.length > 0) {
        const contactInserts = editedDeal.contact_ids.map(contactId => ({
          deal_id: deal.id,
          contact_id: contactId,
        }));
        await supabase.from('deal_contacts').insert(contactInserts);
      }

      // Log activity if there were changes
      if (changes.length > 0) {
        await logActivity(changes);
      }

      toast({
        title: 'Success',
        description: 'Deal updated successfully',
      });

      setEditMode(false);
      onUpdate();
      fetchLinkedEntities(); // Refresh the linked entities display
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setEditedDeal({
      stage_id: deal.stage_id || '',
      value: deal.value || 0,
      expected_close_date: deal.expected_close_date || '',
      site_id: deal.site_id || '',
      company_ids: linkedCompanies.map(c => c.id),
      contact_ids: linkedContacts.map(c => c.id),
    });
    setEditMode(false);
  };

  const currentStage = getCurrentStage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Deal Details</CardTitle>
              <CardDescription>Basic information about this deal</CardDescription>
            </div>
            {!editMode ? (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* Stage */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Stage</span>
              {editMode ? (
                <Select
                  value={editedDeal.stage_id}
                  onValueChange={(value) => setEditedDeal(prev => ({ ...prev, stage_id: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className="bg-blue-500 text-white">
                  {currentStage?.name || deal.status}
                </Badge>
              )}
            </div>
            
            {/* Value */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Value
              </span>
              {editMode ? (
                <Input
                  type="number"
                  value={editedDeal.value}
                  onChange={(e) => setEditedDeal(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  className="w-40"
                />
              ) : (
                <span className="font-semibold">
                  {deal.currencies?.symbol || '$'}{deal.value?.toLocaleString() || '0'}
                </span>
              )}
            </div>
            
            {/* Probability */}
            {currentStage?.win_percentage !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Probability
                </span>
                <span>{currentStage.win_percentage}%</span>
              </div>
            )}
            
            {/* Expected Close Date */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Expected Close
              </span>
              {editMode ? (
                <Input
                  type="date"
                  value={editedDeal.expected_close_date}
                  onChange={(e) => setEditedDeal(prev => ({ ...prev, expected_close_date: e.target.value }))}
                  className="w-40"
                />
              ) : (
                <span>{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'Not set'}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Related Information</CardTitle>
              <CardDescription>Customer, site, companies, and contact details</CardDescription>
            </div>
            {!editMode && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Relations
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Site */}
          {editMode ? (
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Site
              </span>
              <Select
                value={editedDeal.site_id}
                onValueChange={(value) => setEditedDeal(prev => ({ ...prev, site_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border">
                  <SelectItem value="">No Site</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name} - {site.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              {deal.sites ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Site
                  </span>
                  <span>{deal.sites.name}</span>
                </div>
              ) : sites.find(s => s.id === deal.site_id) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Site
                  </span>
                  <span>{sites.find(s => s.id === deal.site_id)?.name}</span>
                </div>
              )}
            </>
          )}

          {/* Companies */}
          {editMode ? (
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Companies
              </span>
              <MultiSelectDropdown
                options={companies.map(c => ({ id: c.id, name: c.name }))}
                selected={editedDeal.company_ids}
                onSelectionChange={(values) => setEditedDeal(prev => ({ ...prev, company_ids: values }))}
                placeholder="Select companies..."
                searchPlaceholder="Search companies..."
              />
            </div>
          ) : linkedCompanies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-4 w-4" />
                <span className="text-sm font-medium">Companies</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {linkedCompanies.map((company) => (
                  <Badge key={company.id} variant="secondary">
                    {company.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          {editMode ? (
            <div className="space-y-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Contacts
              </span>
              <MultiSelectDropdown
                options={contacts.map(c => ({ 
                  id: c.id, 
                  name: `${c.first_name} ${c.last_name}${c.email ? ` (${c.email})` : ''}` 
                }))}
                selected={editedDeal.contact_ids}
                onSelectionChange={(values) => setEditedDeal(prev => ({ ...prev, contact_ids: values }))}
                placeholder="Select contacts..."
                searchPlaceholder="Search contacts..."
              />
            </div>
          ) : linkedContacts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">Contacts</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {linkedContacts.map((contact) => (
                  <Badge key={contact.id} variant="secondary">
                    {contact.first_name} {contact.last_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Customer (existing) */}
          {deal.customers && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Customer
              </span>
              <span>{deal.customers.name}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created
            </span>
            <span>{new Date(deal.created_at).toLocaleDateString()}</span>
          </div>

          {editMode && (
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Relations
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {deal.description && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{deal.description}</p>
          </CardContent>
        </Card>
      )}

      {deal.notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{deal.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};