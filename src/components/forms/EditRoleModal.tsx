import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PermissionsMatrix } from './PermissionsMatrix';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  permissions: any;
  active: boolean;
  created_at: string;
}

interface EditRoleModalProps {
  role: CustomRole | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditRoleModal = ({ role, open, onClose, onSuccess }: EditRoleModalProps) => {
  const { toast } = useToast();
  const [roleData, setRoleData] = useState({
    name: '',
    description: '',
    permissions: {}
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role) {
      setRoleData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || {}
      });
    }
  }, [role]);

  const handleSave = async () => {
    if (!role || !roleData.name.trim()) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('custom_roles')
        .update({
          name: roleData.name.trim(),
          description: roleData.description?.trim() || null,
          permissions: roleData.permissions
        })
        .eq('id', role.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Role "${roleData.name}" updated successfully`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error", 
        description: error?.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Custom Role</DialogTitle>
          <DialogDescription>
            Modify the role permissions and details.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                value={roleData.name}
                onChange={(e) => setRoleData({ ...roleData, name: e.target.value })}
                placeholder="e.g., Project Manager"
              />
            </div>
            <div>
              <Label htmlFor="edit-role-description">Description</Label>
              <Textarea
                id="edit-role-description"
                value={roleData.description}
                onChange={(e) => setRoleData({ ...roleData, description: e.target.value })}
                placeholder="Describe the role responsibilities..."
                rows={3}
              />
            </div>
          </div>
          
          <PermissionsMatrix
            permissions={roleData.permissions}
            onChange={(permissions) => setRoleData({ ...roleData, permissions })}
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!roleData.name.trim() || loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};