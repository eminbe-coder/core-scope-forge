import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Calendar, Building, MapPin, Percent, Edit3, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useToast } from '@/hooks/use-toast';

interface DealStage {
  id: string;
  name: string;
  win_percentage: number;
}

interface Deal {
  id: string;
  name: string;
  description?: string;
  value?: number;
  status: string;
  stage_id?: string;
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
  const [editMode, setEditMode] = useState(false);
  const [editedDeal, setEditedDeal] = useState({
    stage_id: deal.stage_id || '',
    value: deal.value || 0,
    expected_close_date: deal.expected_close_date || '',
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

  useEffect(() => {
    fetchStages();
  }, [currentTenant]);

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

      // Update deal
      const { error } = await supabase
        .from('deals')
        .update({
          stage_id: editedDeal.stage_id || null,
          value: editedDeal.value,
          expected_close_date: editedDeal.expected_close_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deal.id);

      if (error) throw error;

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
          <CardTitle>Related Information</CardTitle>
          <CardDescription>Customer and site details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deal.customers && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Customer
              </span>
              <span>{deal.customers.name}</span>
            </div>
          )}
          
          {deal.sites && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Site
              </span>
              <span>{deal.sites.name}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Created
            </span>
            <span>{new Date(deal.created_at).toLocaleDateString()}</span>
          </div>
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