import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Mail, CheckCircle, AlertCircle, Loader2, Lock, Hash, Eye, EyeOff, Link2, Unlink, Calendar } from 'lucide-react';

const SecuritySettings = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [currentRecoveryEmail, setCurrentRecoveryEmail] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Google connection state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleScopes, setGoogleScopes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadProfile();
      checkGoogleConnection();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('recovery_email, is_recovery_email_verified')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentRecoveryEmail(data.recovery_email);
        setRecoveryEmail(data.recovery_email || '');
        setIsVerified(data.is_recovery_email_verified || false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_google_credentials')
        .select('scopes, expires_at')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!error && data) {
        setGoogleConnected(true);
        setGoogleScopes(data.scopes || []);
      } else {
        setGoogleConnected(false);
        setGoogleScopes([]);
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  };

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      // Use linkIdentity to attach Google to existing SID account without logging out
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/security-settings`,
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        // Handle specific error for already linked accounts
        if (error.message?.includes('already linked') || error.code === 'identity_already_exists') {
          toast({
            title: 'Already Linked',
            description: 'This Google account is already connected to another user. Please use a different Google account.',
            variant: 'destructive',
          });
          setGoogleLoading(false);
          return;
        }
        throw error;
      }
      
      // The user will be redirected to Google for identity linking
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect Google account',
        variant: 'destructive',
      });
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('user_google_credentials')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      setGoogleConnected(false);
      setGoogleScopes([]);
      
      toast({
        title: 'Disconnected',
        description: 'Google account has been disconnected',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect Google account',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all password fields.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'New password and confirmation must match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully.',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password.',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveRecoveryEmail = async () => {
    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (recoveryEmail === user?.email) {
      toast({
        title: 'Invalid Email',
        description: 'Recovery email must be different from your primary email.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-recovery-email-verification', {
        body: { recoveryEmail },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send verification email');
      }

      setCurrentRecoveryEmail(recoveryEmail);
      setIsVerified(false);
      
      toast({
        title: 'Verification Email Sent',
        description: `Please check ${recoveryEmail} to verify your recovery email.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save recovery email.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    if (!currentRecoveryEmail) return;
    setRecoveryEmail(currentRecoveryEmail);
    await handleSaveRecoveryEmail();
  };

  const handleRemoveRecoveryEmail = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          recovery_email: null,
          is_recovery_email_verified: false,
          recovery_email_verification_token: null,
          recovery_email_token_expires_at: null,
        })
        .eq('id', user?.id);

      if (error) throw error;

      setCurrentRecoveryEmail(null);
      setRecoveryEmail('');
      setIsVerified(false);

      toast({
        title: 'Recovery Email Removed',
        description: 'Your recovery email has been removed.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove recovery email.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Security Settings</h1>
            <p className="text-muted-foreground">Manage your account security and credentials</p>
          </div>
        </div>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your unique SID Account ID is linked to your profile and remains constant even if you change your email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">SID Account ID</p>
                <p className="text-2xl font-mono font-bold text-primary">
                  {profile?.account_id || 'Loading...'}
                </p>
              </div>
              <Badge variant="secondary">Permanent</Badge>
            </div>
            <div className="space-y-2">
              <Label>Primary Email</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Your primary email is used for login and notifications.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure. You can only change your own password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={changingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={changingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || !confirmPassword}
            >
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Google Connections Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Connected Accounts
            </CardTitle>
            <CardDescription>
              Connect external services to sync your calendar and tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Google Calendar & Tasks</p>
                  <p className="text-sm text-muted-foreground">
                    {googleConnected 
                      ? 'Sync your to-dos with Google Calendar'
                      : 'Connect to enable calendar sync'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {googleConnected && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
                {googleConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectGoogle}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Unlink className="h-4 w-4 mr-2" />
                        Disconnect
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnectGoogle}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect Google
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
            
            {googleConnected && googleScopes.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Granted permissions:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {googleScopes.map((scope, idx) => (
                    <li key={idx}>{scope.split('/').pop()}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Connect your personal or work Google account</li>
                <li>Enable "Sync to Google Calendar" when creating to-dos</li>
                <li>Appointments will include location details</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Recovery Email Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recovery Email
            </CardTitle>
            <CardDescription>
              Add a personal email address to recover your account if you lose access to your work email.
              This is important if you change jobs but want to keep access to your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Recovery Email (Personal)</Label>
              <div className="flex gap-2">
                <Input
                  id="recovery-email"
                  type="email"
                  placeholder="your.personal@email.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  disabled={saving}
                />
                {currentRecoveryEmail && (
                  <Badge 
                    variant={isVerified ? "default" : "secondary"}
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    {isVerified ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        Pending
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </div>

            {currentRecoveryEmail && !isVerified && (
              <div className="bg-muted/50 border rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  A verification email was sent to <strong>{currentRecoveryEmail}</strong>.
                  Please check your inbox and click the verification link.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto mt-1"
                  onClick={handleResendVerification}
                  disabled={saving}
                >
                  Resend verification email
                </Button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveRecoveryEmail}
                disabled={saving || !recoveryEmail || recoveryEmail === currentRecoveryEmail}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentRecoveryEmail ? 'Update Recovery Email' : 'Add Recovery Email'}
              </Button>
              {currentRecoveryEmail && (
                <Button
                  variant="outline"
                  onClick={handleRemoveRecoveryEmail}
                  disabled={saving}
                >
                  Remove
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SecuritySettings;
