import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserPlus, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface CustomRole {
  id: string;
  name: string;
  description: string;
}

interface FoundUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  account_id: number;
}

interface AddUserBySIDModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess: () => void;
  customRoles?: CustomRole[];
}

export function AddUserBySIDModal({ open, onClose, tenantId, onSuccess, customRoles = [] }: AddUserBySIDModalProps) {
  const [accountId, setAccountId] = useState('');
  const [role, setRole] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const { toast } = useToast();

  const resetState = () => {
    setAccountId('');
    setRole('');
    setFoundUser(null);
    setSearchError(null);
    setIsSearching(false);
    setIsAdding(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSearch = async () => {
    const trimmedId = accountId.trim();
    
    if (!trimmedId || !/^\d{6}$/.test(trimmedId)) {
      setSearchError('Please enter a valid 6-digit SID Account ID');
      setFoundUser(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setFoundUser(null);

    try {
      // Search for user by account_id
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, account_id')
        .eq('account_id', parseInt(trimmedId, 10))
        .maybeSingle();

      if (error) {
        console.error('Error searching for user:', error);
        setSearchError('An error occurred while searching. Please try again.');
        return;
      }

      if (!data) {
        setSearchError('No user found with this SID Account ID');
        return;
      }

      // Check if user is already a member of this tenant
      const { data: existingMembership, error: membershipError } = await supabase
        .from('user_tenant_memberships')
        .select('id, active')
        .eq('user_id', data.id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (membershipError) {
        console.error('Error checking membership:', membershipError);
      }

      if (existingMembership?.active) {
        setSearchError('This user is already a member of this organization');
        return;
      }

      setFoundUser(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('An unexpected error occurred');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUser = async () => {
    if (!foundUser || !role) {
      toast({
        title: 'Error',
        description: 'Please select a role for the user',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);

    try {
      // Determine the actual role value
      const actualRole = role.startsWith('custom_') ? 'member' : role;
      const customRoleId = role.startsWith('custom_') ? role.replace('custom_', '') : null;

      // Check for existing inactive membership to reactivate
      const { data: existingMembership, error: checkError } = await supabase
        .from('user_tenant_memberships')
        .select('id')
        .eq('user_id', foundUser.id)
        .eq('tenant_id', tenantId)
        .eq('active', false)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing membership:', checkError);
      }

      if (existingMembership) {
        // Reactivate existing membership
        const { error: updateError } = await supabase
          .from('user_tenant_memberships')
          .update({
            role: actualRole as 'admin' | 'member' | 'owner' | 'super_admin',
            custom_role_id: customRoleId,
            active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMembership.id);

        if (updateError) throw updateError;
      } else {
        // Create new membership
        const { error: insertError } = await supabase
          .from('user_tenant_memberships')
          .insert({
            user_id: foundUser.id,
            tenant_id: tenantId,
            role: actualRole as 'admin' | 'member' | 'owner' | 'super_admin',
            custom_role_id: customRoleId,
            active: true
          });

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: `${foundUser.first_name || foundUser.email} has been added to the organization.`,
      });

      handleClose();
      onSuccess();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add user to organization',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const displayName = foundUser 
    ? [foundUser.first_name, foundUser.last_name].filter(Boolean).join(' ') || foundUser.email
    : '';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add User by SID Account ID</DialogTitle>
          <DialogDescription>
            Enter the user's 6-digit SID Account ID to add them to this organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="account-id">SID Account ID</Label>
            <div className="flex gap-2">
              <Input
                id="account-id"
                placeholder="123456"
                value={accountId}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setAccountId(value);
                  setSearchError(null);
                  setFoundUser(null);
                }}
                maxLength={6}
                className="font-mono"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || accountId.length !== 6}
                variant="secondary"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {searchError && (
              <p className="text-sm text-destructive">{searchError}</p>
            )}
          </div>

          {/* Found User Card */}
          {foundUser && (
            <Card className="border-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{displayName}</p>
                    <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                    <p className="text-xs text-muted-foreground font-mono">SID: {foundUser.account_id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role Selection - only show when user is found */}
          {foundUser && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  {customRoles.map((customRole) => (
                    <SelectItem key={customRole.id} value={`custom_${customRole.id}`}>
                      {customRole.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddUser} 
            disabled={!foundUser || !role || isAdding}
            className="gap-2"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Add User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
