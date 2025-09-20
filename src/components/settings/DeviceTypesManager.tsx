import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

interface DeviceType {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  active: boolean;
  is_global: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export function DeviceTypesManager() {
  const { user } = useAuth();
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<DeviceType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
  });

  useEffect(() => {
    loadDeviceTypes();
  }, []);

  const loadDeviceTypes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('device_types')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setDeviceTypes(data || []);
    } catch (error) {
      console.error('Error loading device types:', error);
      toast.error('Failed to load device types');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Device type name is required');
      return;
    }

    try {
      if (editingType) {
        // Update existing type
        const { error } = await supabase
          .from('device_types')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            active: formData.active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingType.id);

        if (error) throw error;
        toast.success('Device type updated successfully');
      } else {
        // Create new type
        const maxSortOrder = Math.max(...deviceTypes.map(t => t.sort_order), 0);
        
        const { error } = await supabase
          .from('device_types')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            active: formData.active,
            sort_order: maxSortOrder + 1,
            is_global: true, // Only super admins can create global types
          });

        if (error) throw error;
        toast.success('Device type created successfully');
      }

      setIsDialogOpen(false);
      setEditingType(null);
      setFormData({ name: '', description: '', active: true });
      loadDeviceTypes();
    } catch (error) {
      console.error('Error saving device type:', error);
      toast.error('Failed to save device type');
    }
  };

  const handleEdit = (deviceType: DeviceType) => {
    setEditingType(deviceType);
    setFormData({
      name: deviceType.name,
      description: deviceType.description || '',
      active: deviceType.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device type?')) return;

    try {
      const { error } = await supabase
        .from('device_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Device type deleted successfully');
      loadDeviceTypes();
    } catch (error) {
      console.error('Error deleting device type:', error);
      toast.error('Failed to delete device type');
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('device_types')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Device type ${active ? 'activated' : 'deactivated'}`);
      loadDeviceTypes();
    } catch (error) {
      console.error('Error updating device type:', error);
      toast.error('Failed to update device type');
    }
  };

  if (loading) {
    return <div className="p-6">Loading device types...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Types Management</CardTitle>
        <CardDescription>
          Manage global device types that can be used across all tenants when creating device templates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium">Device Types ({deviceTypes.length})</h3>
            <p className="text-sm text-muted-foreground">
              Configure the available device types for template creation
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Device Type
          </Button>
        </div>

        {deviceTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No device types found. Create your first device type to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceTypes.map((deviceType) => (
                <TableRow key={deviceType.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell className="font-medium">{deviceType.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {deviceType.description || 'No description'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={deviceType.active}
                        onCheckedChange={(checked) => handleToggleActive(deviceType.id, checked)}
                      />
                      <Badge variant={deviceType.active ? 'default' : 'secondary'}>
                        {deviceType.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{deviceType.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(deviceType)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(deviceType.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Edit Device Type' : 'Create Device Type'}
              </DialogTitle>
              <DialogDescription>
                {editingType 
                  ? 'Update the device type information below.'
                  : 'Add a new device type that can be used in templates.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Lighting, Controls, Sensors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description for this device type"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingType ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}