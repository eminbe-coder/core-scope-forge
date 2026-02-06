import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Mail, 
  Hash, 
  Shield, 
  Building2, 
  Loader2, 
  LogOut,
  CheckCircle,
  AlertCircle,
  Calendar,
  Link2,
  Lock,
  Eye,
  EyeOff,
  Unlink,
  Briefcase
} from 'lucide-react';

const PersonalSettings = () => {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { userTenants, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('personal');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleIdentityId, setGoogleIdentityId] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [recoveryEmailStatus, setRecoveryEmailStatus] = useState<{
    email: string | null;
    verified: boolean;
  }>({ email: null, verified: false });

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Recovery email state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [savingRecoveryEmail, setSavingRecoveryEmail] = useState(false);

  useEffect(() => {
    if (user) {
      checkGoogleIdentity();
      loadRecoveryEmailStatus();
    }
  }, [user]);

  const checkGoogleIdentity = async () => {
    try {
      const { data } = await supabase.auth.getUserIdentities();
      const googleIdentity = data?.identities?.find(
        (identity: any) => identity.provider === 'google'
      );
      
      if (googleIdentity) {
        setGoogleConnected(true);
        setGoogleEmail(googleIdentity.identity_data?.email || null);
        setGoogleIdentityId(googleIdentity.id);
      }
    } catch (error) {
      console.error('Error checking Google identity:', error);
    }
  };

  const loadRecoveryEmailStatus = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('recovery_email, is_recovery_email_verified')
        .eq('id', user?.id)
        .single();
      
      if (data) {
        setRecoveryEmailStatus({
          email: data.recovery_email,
          verified: data.is_recovery_email_verified || false,
        });
        setRecoveryEmail(data.recovery_email || '');
      }
    } catch (error) {
      console.error('Error loading recovery email status:', error);
    }
  };

  const handleConnectGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/profile`,
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        if (error.message?.includes('already linked') || error.code === 'identity_already_exists') {
          toast({
            title: 'Already Linked',
            description: 'This Google account is already connected to another user.',
            variant: 'destructive',
          });
          setGoogleLoading(false);
          return;
        }
        throw error;
      }
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
      if (googleIdentityId) {
        const { error } = await supabase.auth.unlinkIdentity({
          id: googleIdentityId,
          provider: 'google',
        } as any);
        
        if (error) throw error;
      }

      setGoogleConnected(false);
      setGoogleEmail(null);
      setGoogleIdentityId(null);
      
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

    setSavingRecoveryEmail(true);
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

      setRecoveryEmailStatus({ email: recoveryEmail, verified: false });
      
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
      setSavingRecoveryEmail(false);
    }
  };

  const handleNavigateToTenant = (tenantId: string) => {
    localStorage.setItem('currentTenantId', tenantId);
    navigate('/dashboard');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (profileLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const hasActiveTenants = userTenants.filter(m => m.active).length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Personal Dashboard</h1>
              <p className="text-sm text-muted-foreground">SID Account #{profile?.account_id}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Welcome Message for users without tenants */}
        {!hasActiveTenants && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-amber-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg">Welcome to SID!</h3>
                  <p className="text-muted-foreground mt-1">
                    Your account is ready. You're not yet a member of any organization. 
                    An administrator can add you using your SID Account ID: <strong className="font-mono text-primary">{profile?.account_id}</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="employment" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Employment
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Your personal account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={profile?.first_name || ''} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={profile?.last_name || ''} disabled className="bg-muted" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">SID Account ID</p>
                      <p className="text-xl font-mono font-bold text-primary">
                        {profile?.account_id || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Permanent</Badge>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Primary Email
                  </Label>
                  <Input value={user?.email || ''} disabled className="bg-muted" />
                </div>
              </CardContent>
            </Card>

            {/* Organizations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organizations
                </CardTitle>
                <CardDescription>
                  {hasActiveTenants 
                    ? 'Organizations you belong to' 
                    : 'You are not a member of any organization yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasActiveTenants ? (
                  <div className="space-y-3">
                    {userTenants.filter(m => m.active).map((membership) => (
                      <div 
                        key={membership.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{membership.tenant.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {membership.role === 'super_admin' ? 'Super Admin' : membership.role}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleNavigateToTenant(membership.tenant_id)}
                        >
                          Open
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No organizations yet</p>
                    <p className="text-sm mt-1">
                      Share your SID Account ID with an admin to join an organization
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Password Change Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
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

            {/* Recovery Email Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Recovery Email
                </CardTitle>
                <CardDescription>
                  Set up a recovery email for account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Current Recovery Email</p>
                      {recoveryEmailStatus.email ? (
                        <p className="text-sm text-muted-foreground">{recoveryEmailStatus.email}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not configured</p>
                      )}
                    </div>
                  </div>
                  {recoveryEmailStatus.email && (
                    recoveryEmailStatus.verified ? (
                      <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="recovery-email">Set Recovery Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="recovery-email"
                      type="email"
                      placeholder="your-recovery@email.com"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSaveRecoveryEmail}
                      disabled={savingRecoveryEmail}
                    >
                      {savingRecoveryEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save & Verify
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Google Connection Card */}
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
                      {googleConnected && googleEmail ? (
                        <p className="text-sm text-muted-foreground">
                          Connected as <span className="font-medium text-foreground">{googleEmail}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Connect to enable calendar and task sync
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {googleConnected && (
                      <Badge variant="default" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
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
                        variant="default"
                        size="sm"
                        onClick={handleConnectGoogle}
                        disabled={googleLoading}
                      >
                        {googleLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Link2 className="h-4 w-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employment Tab */}
          <TabsContent value="employment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Employment History
                </CardTitle>
                <CardDescription>
                  Your work history across organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasActiveTenants ? (
                  <div className="space-y-4">
                    {userTenants.map((membership) => (
                      <div 
                        key={membership.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{membership.tenant.name}</h4>
                            <p className="text-sm text-muted-foreground capitalize">
                              Role: {membership.role === 'super_admin' ? 'Super Admin' : membership.role}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Member of organization
                            </p>
                          </div>
                          <Badge variant={membership.active ? 'default' : 'secondary'}>
                            {membership.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No employment history</p>
                    <p className="text-sm mt-1">
                      Join an organization to start building your work history
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                  Primary Email Verification
                </CardTitle>
                <CardDescription>
                  Coming soon - Verify your primary email for enhanced security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This feature will allow you to verify and manage your primary email address.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PersonalSettings;
