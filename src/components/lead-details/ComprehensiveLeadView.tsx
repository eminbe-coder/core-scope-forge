import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Globe, 
  Edit3, 
  Save, 
  X, 
  Target,
  Calendar,
  FileText,
  Activity,
  CheckSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { LeadActivities } from '@/components/lead-activities/LeadActivities';
import { LeadFiles } from '@/components/lead-files/LeadFiles';
import { EntityRelationships } from '@/components/entity-relationships/EntityRelationships';

interface Lead {
  id: string;
  name: string;
  type: 'contact' | 'company' | 'site';
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  position?: string;
  industry?: string;
  first_name?: string;
  last_name?: string;
  size?: string;
  headquarters?: string;
  description?: string;
  notes?: string;
  stage_id?: string;
  quality_id?: string;
  stage_name?: string;
  quality_name?: string;
  created_at: string;
  updated_at: string;
}

interface ComprehensiveLeadViewProps {
  lead: Lead;
  onUpdate: () => void;
}

export const ComprehensiveLeadView = ({ lead, onUpdate }: ComprehensiveLeadViewProps) => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [editMode, setEditMode] = useState(false);
  const [editedLead, setEditedLead] = useState<Lead>(lead);
  const [saving, setSaving] = useState(false);
  const [leadStages, setLeadStages] = useState<Array<{ id: string; name: string }>>([]);
  const [leadQualities, setLeadQualities] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    setEditedLead(lead);
  }, [lead]);

  // Load lead stages and qualities
  useEffect(() => {
    const loadLeadData = async () => {
      if (!currentTenant) return;
      
      try {
        const [stagesResult, qualitiesResult] = await Promise.all([
          supabase
            .from('lead_stages')
            .select('id, name')
            .eq('tenant_id', currentTenant.id)
            .eq('active', true)
            .order('sort_order'),
          supabase
            .from('lead_quality')
            .select('id, name')
            .eq('tenant_id', currentTenant.id)
            .eq('active', true)
            .order('sort_order')
        ]);

        if (stagesResult.error) throw stagesResult.error;
        if (qualitiesResult.error) throw qualitiesResult.error;

        setLeadStages(stagesResult.data || []);
        setLeadQualities(qualitiesResult.data || []);
      } catch (error) {
        console.error('Error loading lead data:', error);
      }
    };

    loadLeadData();
  }, [currentTenant]);

  const getLeadIcon = (type: string) => {
    switch (type) {
      case 'contact': return User;
      case 'company': return Building2;
      case 'site': return MapPin;
      default: return Target;
    }
  };

  const getLeadTypeColor = (type: string) => {
    switch (type) {
      case 'contact': return 'bg-blue-500';
      case 'company': return 'bg-green-500';
      case 'site': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tableName = lead.type === 'contact' ? 'contacts' : 
                       lead.type === 'company' ? 'companies' : 'sites';
      
      let updateData: any = {};
      
      if (lead.type === 'contact') {
        updateData = {
          first_name: editedLead.first_name,
          last_name: editedLead.last_name,
          email: editedLead.email,
          phone: editedLead.phone,
          position: editedLead.position,
          address: editedLead.address,
          notes: editedLead.notes,
          stage_id: editedLead.stage_id || null,
          quality_id: editedLead.quality_id || null,
        };
      } else if (lead.type === 'company') {
        updateData = {
          name: editedLead.name,
          email: editedLead.email,
          phone: editedLead.phone,
          website: editedLead.website,
          industry: editedLead.industry,
          size: editedLead.size,
          headquarters: editedLead.headquarters,
          description: editedLead.description,
          notes: editedLead.notes,
          stage_id: editedLead.stage_id || null,
          quality_id: editedLead.quality_id || null,
        };
      } else if (lead.type === 'site') {
        updateData = {
          name: editedLead.name,
          address: editedLead.address,
          notes: editedLead.notes,
          stage_id: editedLead.stage_id || null,
          quality_id: editedLead.quality_id || null,
        };
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Lead updated successfully',
      });

      setEditMode(false);
      onUpdate();
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

  const handleConvertToDeal = () => {
    navigate(`/deals/add?leadType=${lead.type}&leadId=${lead.id}`);
  };

  const IconComponent = getLeadIcon(lead.type);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${getLeadTypeColor(lead.type)}`}>
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">{lead.name}</CardTitle>
                  <Badge variant="secondary" className="capitalize">
                    {lead.type} Lead
                  </Badge>
                </div>
                <CardDescription>
                  Created {new Date(lead.created_at).toLocaleDateString()} • 
                  Last updated {new Date(lead.updated_at).toLocaleDateString()}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleConvertToDeal}>
                <Target className="h-4 w-4 mr-2" />
                Convert to Deal
              </Button>
              {editMode ? (
                <>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setEditMode(false);
                    setEditedLead(lead);
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lead Information */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lead.type === 'contact' && (
              <>
                <div className="space-y-2">
                  <Label>First Name</Label>
                  {editMode ? (
                    <Input
                      value={editedLead.first_name || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, first_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-muted-foreground">{lead.first_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  {editMode ? (
                    <Input
                      value={editedLead.last_name || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, last_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-muted-foreground">{lead.last_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  {editMode ? (
                    <Input
                      value={editedLead.position || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, position: e.target.value })}
                    />
                  ) : (
                    <p className="text-muted-foreground">{lead.position || 'Not specified'}</p>
                  )}
                </div>
              </>
            )}

            {lead.type === 'company' && (
              <>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  {editMode ? (
                    <Input
                      value={editedLead.name}
                      onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                    />
                  ) : (
                    <p className="text-muted-foreground">{lead.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  {editMode ? (
                    <Input
                      value={editedLead.industry || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, industry: e.target.value })}
                    />
                  ) : (
                    <p className="text-muted-foreground">{lead.industry || 'Not specified'}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Company Size</Label>
                  {editMode ? (
                    <Input
                      value={editedLead.size || ''}
                      onChange={(e) => setEditedLead({ ...editedLead, size: e.target.value })}
                    />
                  ) : (
                    <p className="text-muted-foreground">{lead.size || 'Not specified'}</p>
                  )}
                </div>
              </>
            )}

            {lead.type === 'site' && (
              <div className="space-y-2">
                <Label>Site Name</Label>
                {editMode ? (
                  <Input
                    value={editedLead.name}
                    onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                  />
                ) : (
                  <p className="text-muted-foreground">{lead.name}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              {editMode ? (
                <Input
                  type="email"
                  value={editedLead.email || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, email: e.target.value })}
                />
              ) : (
                <p className="text-muted-foreground">{lead.email || 'Not provided'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              {editMode ? (
                <Input
                  value={editedLead.phone || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, phone: e.target.value })}
                />
              ) : (
                <p className="text-muted-foreground">{lead.phone || 'Not provided'}</p>
              )}
            </div>

            {lead.type === 'company' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                {editMode ? (
                  <Input
                    value={editedLead.website || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, website: e.target.value })}
                  />
                ) : (
                  <p className="text-muted-foreground">{lead.website || 'Not provided'}</p>
                )}
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {lead.type === 'company' ? 'Headquarters' : 'Address'}
              </Label>
              {editMode ? (
                <Input
                  value={editedLead.address || editedLead.headquarters || ''}
                  onChange={(e) => setEditedLead({ 
                    ...editedLead, 
                    [lead.type === 'company' ? 'headquarters' : 'address']: e.target.value 
                  })}
                />
              ) : (
                <p className="text-muted-foreground">
                  {lead.address || lead.headquarters || 'Not provided'}
                </p>
              )}
            </div>

            {(lead.description || editMode) && (
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                {editMode ? (
                  <Textarea
                    value={editedLead.description || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, description: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-muted-foreground">{lead.description || 'No description'}</p>
                )}
              </div>
            )}

            {(lead.notes || editMode) && (
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                {editMode ? (
                  <Textarea
                    value={editedLead.notes || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, notes: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-muted-foreground">{lead.notes || 'No notes'}</p>
                )}
              </div>
            )}

            {/* Quality and Stage Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Lead Stage</Label>
                {editMode ? (
                  <Select value={editedLead.stage_id || ''} onValueChange={(value) => setEditedLead({ ...editedLead, stage_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-muted-foreground">{lead.stage_name || 'Not set'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Lead Quality</Label>
                {editMode ? (
                  <Select value={editedLead.quality_id || ''} onValueChange={(value) => setEditedLead({ ...editedLead, quality_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadQualities.map((quality) => (
                        <SelectItem key={quality.id} value={quality.id}>
                          {quality.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-muted-foreground">{lead.quality_name || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Activities, Todos, and Files */}
      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="todos" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            To-Dos
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="relationships" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Relationships
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <LeadActivities
            entityId={lead.id}
            entityType={lead.type}
            entityName={lead.name}
          />
        </TabsContent>

        <TabsContent value="todos">
          <LeadActivities
            entityId={lead.id}
            entityType={lead.type}
            entityName={lead.name}
          />
        </TabsContent>

        <TabsContent value="files">
          <LeadFiles
            leadId={lead.id}
            leadType={lead.type}
            leadName={lead.name}
          />
        </TabsContent>

        <TabsContent value="relationships">
          <EntityRelationships 
            entityType={lead.type === 'contact' ? 'lead_contact' : 'lead_company'} 
            entityId={lead.id} 
            title="Linked Companies & Contacts"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};