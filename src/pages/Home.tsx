import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Copy, Check, LogOut, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

interface TenantMembership {
  id: string;
  tenant_id: string;
  role: string;
  active: boolean;
  tenant: Tenant;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  account_id: number;
  avatar_url: string | null;
}

const Home = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenantMemberships, setTenantMemberships] = useState<TenantMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchUserData();
    }
  }, [user, authLoading, navigate]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch profile with account_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, account_id, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setProfile(profileData);
      }

      // Fetch tenant memberships using the RPC function
      const { data: memberships, error: membershipsError } = await supabase
        .rpc('get_user_tenant_memberships', { _user_id: user.id });

      if (membershipsError) {
        console.error('Error fetching memberships:', membershipsError);
      } else {
        // Transform the data to match our interface
        const transformedMemberships = (memberships || []).map((m: any) => ({
          id: m.id,
          tenant_id: m.tenant_id,
          role: m.role,
          active: m.active,
          tenant: m.tenant as Tenant
        }));
        setTenantMemberships(transformedMemberships);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyAccountId = async () => {
    if (!profile?.account_id) return;
    
    try {
      await navigator.clipboard.writeText(String(profile.account_id));
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Your SID Account ID has been copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleTenantSelect = (tenantId: string) => {
    // Store tenant selection and navigate to dashboard
    localStorage.setItem('currentTenantId', tenantId);
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">SID Portal</h1>
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* User Identity Card */}
        <Card className="mb-8">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={displayName} 
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">{displayName}</CardTitle>
            <CardDescription>{profile.email}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="inline-flex items-center gap-3 bg-muted rounded-lg px-6 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your SID Account ID</p>
                <p className="text-3xl font-mono font-bold tracking-wider text-primary">
                  {profile.account_id}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={copyAccountId}
                className="h-10 w-10"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Share this ID with administrators to be added to their organizations
            </p>
          </CardContent>
        </Card>

        {/* Organizations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Organizations</h2>
            <Badge variant="secondary">{tenantMemberships.length} organization{tenantMemberships.length !== 1 ? 's' : ''}</Badge>
          </div>
          
          <Separator />

          {tenantMemberships.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Organizations Yet</h3>
                <p className="text-muted-foreground">
                  Share your SID Account ID ({profile.account_id}) with an administrator to be added to their organization.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tenantMemberships.map((membership) => (
                <Card 
                  key={membership.id} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleTenantSelect(membership.tenant_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{membership.tenant.name}</h3>
                          <p className="text-sm text-muted-foreground capitalize">{membership.role}</p>
                        </div>
                      </div>
                      <Badge variant={membership.active ? 'default' : 'secondary'}>
                        {membership.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
