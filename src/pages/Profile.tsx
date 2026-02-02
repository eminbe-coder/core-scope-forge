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
import { Separator } from '@/components/ui/separator';
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
  Link2
} from 'lucide-react';

const Profile = () => {
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { userTenants, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [recoveryEmailStatus, setRecoveryEmailStatus] = useState<{
    email: string | null;
    verified: boolean;
  }>({ email: null, verified: false });

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
      }
    } catch (error) {
      console.error('Error loading recovery email status:', error);
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
                  <p className="text-sm text-muted-foreground mt-2">
                    Share this ID with your organization's admin to get started.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Information */}
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

        {/* Security Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Status
            </CardTitle>
            <CardDescription>
              Your account security configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recovery Email Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Recovery Email</p>
                  {recoveryEmailStatus.email ? (
                    <p className="text-sm text-muted-foreground">
                      {recoveryEmailStatus.email}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not configured</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {recoveryEmailStatus.email ? (
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
                ) : (
                  <Badge variant="outline">Not Set</Badge>
                )}
              </div>
            </div>

            {/* Google Connection Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium">Google Calendar & Tasks</p>
                  {googleConnected && googleEmail ? (
                    <p className="text-sm text-muted-foreground">{googleEmail}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>
              </div>
              {googleConnected ? (
                <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                  <Link2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline">Not Connected</Badge>
              )}
            </div>

            <Button 
              variant="outline" 
              onClick={() => navigate('/security-settings')}
              className="w-full"
            >
              <Shield className="h-4 w-4 mr-2" />
              Manage Security Settings
            </Button>
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
      </main>
    </div>
  );
};

export default Profile;
