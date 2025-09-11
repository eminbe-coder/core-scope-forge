import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cloud, CheckCircle, AlertCircle, Settings, TestTube, FolderTree } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/use-tenant';
import { useAuth } from '@/hooks/use-auth';

interface OneDriveSettings {
  id?: string;
  enabled: boolean;
  client_id: string;
  client_secret: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  root_folder_id?: string;
  selected_library_id?: string;
  selected_library_name?: string;
  folder_structure?: {
    customers: string;
    sites: string;
    deals: string;
  };
}

interface DocumentLibrary {
  id: string;
  name: string;
  type: 'personal' | 'sharepoint';
  webUrl: string;
  siteId?: string;
}

export const OneDriveSettings = () => {
  const { currentTenant } = useTenant();
  const { session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingLibraries, setLoadingLibraries] = useState(false);
  const [settings, setSettings] = useState<OneDriveSettings>({
    enabled: false,
    client_id: '',
    client_secret: ''
  });
  const [isConnected, setIsConnected] = useState(false);
  const [libraries, setLibraries] = useState<DocumentLibrary[]>([]);

  useEffect(() => {
    if (currentTenant) {
      fetchSettings();
    }
  }, [currentTenant]);

  const fetchSettings = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('tenant_onedrive_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching OneDrive settings:', error);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          enabled: data.enabled,
          client_id: data.client_id || '',
          client_secret: data.client_secret || '',
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_expires_at: data.token_expires_at,
          root_folder_id: data.root_folder_id,
          selected_library_id: data.selected_library_id,
          selected_library_name: data.selected_library_name,
          folder_structure: data.folder_structure as { customers: string; sites: string; deals: string; } || { customers: '', sites: '', deals: '' }
        });
        setIsConnected(!!data.access_token);
        
        // Fetch libraries if connected
        if (data.access_token) {
          fetchLibraries();
        }
      }
    } catch (error) {
      console.error('Error fetching OneDrive settings:', error);
    }
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    setLoading(true);
    try {
      const settingsData = {
        tenant_id: currentTenant.id,
        enabled: settings.enabled,
        client_id: settings.client_id,
        client_secret: settings.client_secret,
        updated_at: new Date().toISOString()
      };

      if (settings.id) {
        const { error } = await supabase
          .from('tenant_onedrive_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('tenant_onedrive_settings')
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Settings saved",
        description: "OneDrive integration settings have been updated successfully."
      });
    } catch (error) {
      console.error('Error saving OneDrive settings:', error);
      toast({
        title: "Error",
        description: "Failed to save OneDrive settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraries = async () => {
    if (!currentTenant || !isConnected || !session?.access_token) return;

    setLoadingLibraries(true);
    try {
      const { data, error } = await supabase.functions.invoke('onedrive-auth', {
        body: {
          action: 'get_libraries',
          tenant_id: currentTenant.id
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Library fetch error:', error);
        throw error;
      }

      if (data.libraries) {
        setLibraries(data.libraries);
        
        // Show success message if libraries were found
        if (data.libraries.length > 0) {
          toast({
            title: "Libraries loaded",
            description: `Found ${data.libraries.length} available document libraries.`
          });
        } else {
          toast({
            title: "No libraries found",
            description: "No accessible document libraries were found in your OneDrive or SharePoint sites.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error fetching libraries:', error);
      
      // Provide specific error messaging
      let errorMessage = "Failed to fetch available document libraries.";
      
      if (error.message && error.message.includes('401')) {
        errorMessage = "Authentication expired. Please reconnect to OneDrive.";
      } else if (error.message && error.message.includes('403')) {
        errorMessage = "Access denied. Please check your OneDrive permissions.";
      } else if (error.message && error.message.includes('Missing authorization header')) {
        errorMessage = "Session expired. Please refresh the page and try again.";
      }
      
      toast({
        title: "Error loading libraries",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoadingLibraries(false);
    }
  };

  const handleLibrarySelect = async (libraryId: string) => {
    const selectedLibrary = libraries.find(lib => lib.id === libraryId);
    if (!selectedLibrary || !currentTenant || !session?.access_token) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('onedrive-auth', {
        body: {
          action: 'set_library',
          tenant_id: currentTenant.id,
          library_id: libraryId,
          library_name: selectedLibrary.name
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        selected_library_id: libraryId,
        selected_library_name: selectedLibrary.name
      }));

      toast({
        title: "Library selected",
        description: `Selected "${selectedLibrary.name}" for file storage.`
      });
    } catch (error) {
      console.error('Error setting library:', error);
      toast({
        title: "Error",
        description: "Failed to set selected library.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!settings.client_id || !settings.client_secret) {
      toast({
        title: "Missing credentials",
        description: "Please provide both Client ID and Client Secret before connecting.",
        variant: "destructive"
      });
      return;
    }

    // Save settings first to ensure they're stored
    await handleSave();

    try {
      const { data, error } = await supabase.functions.invoke('onedrive-auth', {
        body: {
          action: 'initialize',
          tenant_id: currentTenant?.id,
          client_id: settings.client_id,
          client_secret: settings.client_secret
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) {
        console.error('OneDrive connection error:', error);
        throw error;
      }

      if (data.auth_url) {
        window.open(data.auth_url, '_blank', 'width=600,height=700');
        
        toast({
          title: "Authentication started",
          description: "Please complete the authentication in the popup window. After authentication, refresh this page to see available libraries."
        });
      }
    } catch (error) {
      console.error('Error initiating OneDrive connection:', error);
      toast({
        title: "Connection error",
        description: "Failed to initiate OneDrive connection. Please check your credentials and try again.",
        variant: "destructive"
      });
    }
  };

  const handleTestConnection = async () => {
    if (!isConnected) {
      toast({
        title: "Not connected",
        description: "Please connect to OneDrive first.",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('onedrive-auth', {
        body: {
          action: 'test',
          tenant_id: currentTenant?.id
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (error) {
        console.error('Test connection error:', error);
        throw error;
      }

      if (data.success) {
        toast({
          title: "Connection successful",
          description: `Connected to ${data.drive_name} (${data.owner || 'Unknown user'}).`
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.error || "Unable to connect to OneDrive.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing OneDrive connection:', error);
      
      let errorMessage = "Failed to test OneDrive connection.";
      
      if (error.message && error.message.includes('401')) {
        errorMessage = "Authentication expired. Please reconnect to OneDrive.";
      } else if (error.message && error.message.includes('403')) {
        errorMessage = "Access denied. Please check your OneDrive permissions.";
      } else if (error.message && error.message.includes('Missing authorization header')) {
        errorMessage = "Session expired. Please refresh the page and try again.";
      }
      
      toast({
        title: "Test failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentTenant || !settings.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tenant_onedrive_settings')
        .update({
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          root_folder_id: null,
          folder_structure: { customers: '', sites: '', deals: '' }
        })
        .eq('id', settings.id);

      if (error) throw error;

      setIsConnected(false);
      setLibraries([]);
      setSettings(prev => ({
        ...prev,
        access_token: undefined,
        refresh_token: undefined,
        token_expires_at: undefined,
        root_folder_id: undefined,
        selected_library_id: undefined,
        selected_library_name: undefined,
        folder_structure: { customers: '', sites: '', deals: '' }
      }));

      toast({
        title: "Disconnected",
        description: "OneDrive has been disconnected successfully."
      });
    } catch (error) {
      console.error('Error disconnecting OneDrive:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect OneDrive. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Microsoft OneDrive Integration
          </CardTitle>
          <CardDescription>
            Configure OneDrive for Business integration to store all tenant files in your OneDrive account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enabled">Enable OneDrive Integration</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable OneDrive file storage for this tenant
              </p>
            </div>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Microsoft Client ID</Label>
              <Input
                id="client_id"
                placeholder="Enter your Microsoft App Client ID"
                value={settings.client_id}
                onChange={(e) => setSettings(prev => ({ ...prev, client_id: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_secret">Microsoft Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                placeholder="Enter your Microsoft App Client Secret"
                value={settings.client_secret}
                onChange={(e) => setSettings(prev => ({ ...prev, client_secret: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>

            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </>
                )}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">OneDrive Connection</h4>
            
            <div className="flex items-center gap-2">
            {!isConnected ? (
                <Button 
                  onClick={handleConnect} 
                  disabled={!settings.client_id || !settings.client_secret || !session?.access_token}
                  variant="outline"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Connect to OneDrive
                </Button>
              ) : (
                <>
                  <Button onClick={handleTestConnection} disabled={testing || !session?.access_token} variant="outline">
                    <TestTube className="h-4 w-4 mr-2" />
                    {testing ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button onClick={handleDisconnect} disabled={loading} variant="outline">
                    Disconnect
                  </Button>
                </>
              )}
              
              {!session?.access_token && (
                <p className="text-sm text-muted-foreground mt-2">
                  Session expired. Please refresh the page to continue.
                </p>
              )}
            </div>

            {isConnected && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="library-select">Document Library</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select which document library to use for storing files
                  </p>
                  <div className="flex items-center gap-2">
                    <Select
                      value={settings.selected_library_id || ''}
                      onValueChange={handleLibrarySelect}
                      disabled={loadingLibraries || loading}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a document library..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50 max-h-[200px] overflow-y-auto">
                        {libraries.map((library) => (
                          <SelectItem key={library.id} value={library.id}>
                            <div className="flex items-center gap-2">
                              <FolderTree className="h-4 w-4" />
                              <span>{library.name}</span>
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {library.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={fetchLibraries}
                      disabled={loadingLibraries || loading}
                      variant="outline"
                      size="sm"
                    >
                      {loadingLibraries ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>
                  {settings.selected_library_name && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {settings.selected_library_name}
                    </p>
                  )}
                </div>

                {settings.folder_structure && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="text-sm font-medium mb-2">Folder Structure</h5>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>• Customers: /{settings.folder_structure.customers || 'Customers'}</p>
                      <p>• Sites: /{settings.folder_structure.sites || 'Sites'}</p>
                      <p>• Deals: /{settings.folder_structure.deals || 'Deals'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to set up Microsoft OneDrive integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p><strong>1.</strong> Go to the Microsoft Azure Portal and register a new app</p>
            <p><strong>2.</strong> Add the following redirect URI: <code className="bg-muted px-2 py-1 rounded">{window.location.origin}/api/onedrive/callback</code></p>
            <p><strong>3.</strong> Grant the following permissions: Files.ReadWrite, Files.ReadWrite.All</p>
            <p><strong>4.</strong> Copy the Client ID and Client Secret to the fields above</p>
            <p><strong>5.</strong> Save settings and click "Connect to OneDrive"</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};