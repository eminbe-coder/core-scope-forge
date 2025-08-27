import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OneDriveAuthRequest {
  action: 'initialize' | 'callback' | 'test' | 'get_libraries' | 'set_library';
  tenant_id?: string;
  client_id?: string;
  client_secret?: string;
  code?: string;
  library_id?: string;
  library_name?: string;
}

// Helper function to refresh access token
async function refreshAccessToken(supabase: any, tenant_id: string, refresh_token: string, client_id: string, client_secret: string) {
  console.log(`Refreshing access token for tenant: ${tenant_id}`);
  
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: client_id,
      client_secret: client_secret,
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    }),
  });

  const tokenData = await response.json();

  if (!response.ok) {
    console.error('Token refresh error:', tokenData);
    throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error}`);
  }

  // Update stored tokens
  const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
  
  const { error: updateError } = await supabase
    .from('tenant_onedrive_settings')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refresh_token, // Keep old refresh token if new one not provided
      token_expires_at: expiresAt.toISOString(),
    })
    .eq('tenant_id', tenant_id);

  if (updateError) {
    console.error('Failed to update refreshed tokens:', updateError);
    throw new Error('Failed to save refreshed tokens');
  }

  console.log('Access token refreshed successfully');
  return tokenData.access_token;
}

// Helper function to make authenticated Graph API requests with automatic token refresh
async function makeGraphRequest(supabase: any, tenant_id: string, url: string, options: any = {}) {
  // Get current token settings
  const { data: settings, error: settingsError } = await supabase
    .from('tenant_onedrive_settings')
    .select('access_token, refresh_token, client_id, client_secret, token_expires_at')
    .eq('tenant_id', tenant_id)
    .single();

  if (settingsError || !settings) {
    throw new Error('Tenant OneDrive settings not found');
  }

  let accessToken = settings.access_token;

  // Check if token is expired or about to expire (within 5 minutes)
  if (settings.token_expires_at) {
    const expiresAt = new Date(settings.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('Access token expired or expiring soon, refreshing...');
      if (!settings.refresh_token) {
        throw new Error('No refresh token available');
      }
      
      accessToken = await refreshAccessToken(
        supabase, 
        tenant_id, 
        settings.refresh_token, 
        settings.client_id, 
        settings.client_secret
      );
    }
  }

  // Prepare headers with authorization
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    ...options.headers
  };

  console.log(`Making Graph API request to: ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers
  });

  // If we get 401, try refreshing token once
  if (response.status === 401 && settings.refresh_token) {
    console.log('Received 401, attempting token refresh...');
    try {
      accessToken = await refreshAccessToken(
        supabase, 
        tenant_id, 
        settings.refresh_token, 
        settings.client_id, 
        settings.client_secret
      );

      // Retry the request with new token
      const retryHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
      };

      console.log(`Retrying Graph API request to: ${url}`);
      return await fetch(url, {
        ...options,
        headers: retryHeaders
      });
    } catch (refreshError) {
      console.error('Token refresh failed during retry:', refreshError);
      throw new Error('Authentication failed and token refresh unsuccessful');
    }
  }

  return response;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, tenant_id, client_id, client_secret, code, library_id, library_name } = await req.json() as OneDriveAuthRequest;

    console.log(`OneDrive Auth - Action: ${action}, Tenant: ${tenant_id}`);

    switch (action) {
      case 'initialize': {
        if (!tenant_id || !client_id || !client_secret) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate OAuth URL
        const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/onedrive-auth`;
        const scope = 'Files.ReadWrite Files.ReadWrite.All offline_access';
        const state = btoa(JSON.stringify({ tenant_id }));

        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `client_id=${encodeURIComponent(client_id)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scope)}&` +
          `state=${encodeURIComponent(state)}&` +
          `response_mode=query`;

        return new Response(
          JSON.stringify({ auth_url: authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'callback': {
        const url = new URL(req.url);
        const authCode = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          console.error('OAuth error:', error);
          return new Response(
            `<html><body><script>window.close();</script><p>Authentication failed: ${error}</p></body></html>`,
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        if (!authCode || !state) {
          return new Response(
            '<html><body><script>window.close();</script><p>Missing authorization code or state</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        try {
          const { tenant_id } = JSON.parse(atob(state));

          // Get tenant's OneDrive settings
          const { data: settings, error: settingsError } = await supabase
            .from('tenant_onedrive_settings')
            .select('client_id, client_secret')
            .eq('tenant_id', tenant_id)
            .single();

          if (settingsError || !settings) {
            console.error('Settings error:', settingsError);
            return new Response(
              '<html><body><script>window.close();</script><p>Tenant settings not found</p></body></html>',
              { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
            );
          }

          // Exchange code for tokens
          const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
          const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/onedrive-auth`;

          const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: settings.client_id,
              client_secret: settings.client_secret,
              code: authCode,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
            }),
          });

          const tokenData = await tokenResponse.json();

          if (!tokenResponse.ok) {
            console.error('Token error:', tokenData);
            return new Response(
              '<html><body><script>window.close();</script><p>Failed to get access token</p></body></html>',
              { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
            );
          }

          // Get OneDrive root folder ID using helper function
          const driveResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive/root', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
            },
          });

          if (!driveResponse.ok) {
            const errorData = await driveResponse.json();
            console.error('Failed to get drive root:', errorData);
            throw new Error('Failed to access OneDrive');
          }

          const driveData = await driveResponse.json();
          const rootFolderId = driveData.id;

          // Create base folder structure
          const folderStructure = {
            customers: 'Customers',
            sites: 'Sites', 
            deals: 'Deals'
          };

          // Create folders
          for (const [key, folderName] of Object.entries(folderStructure)) {
            try {
              console.log(`Creating folder: ${folderName}`);
              const folderResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${tokenData.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: folderName,
                  folder: {},
                  '@microsoft.graph.conflictBehavior': 'rename'
                }),
              });

              if (!folderResponse.ok) {
                const folderError = await folderResponse.json();
                console.log(`Folder creation response for ${folderName}:`, folderError);
                // Continue if folder already exists
                if (folderError.error?.code !== 'nameAlreadyExists') {
                  console.error(`Failed to create folder ${folderName}:`, folderError);
                }
              } else {
                console.log(`Successfully created folder: ${folderName}`);
              }
            } catch (error) {
              console.log(`Error creating folder ${folderName}:`, error);
            }
          }

          // Save tokens to database
          const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

          const { error: updateError } = await supabase
            .from('tenant_onedrive_settings')
            .update({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              token_expires_at: expiresAt.toISOString(),
              root_folder_id: rootFolderId,
              folder_structure: folderStructure,
            })
            .eq('tenant_id', tenant_id);

          if (updateError) {
            console.error('Update error:', updateError);
            return new Response(
              '<html><body><script>window.close();</script><p>Failed to save tokens</p></body></html>',
              { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
            );
          }

          return new Response(
            '<html><body><script>window.close();</script><p>OneDrive connected successfully!</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );

        } catch (error) {
          console.error('Callback processing error:', error);
          return new Response(
            '<html><body><script>window.close();</script><p>Processing failed</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }
      }

      case 'test': {
        if (!tenant_id) {
          return new Response(
            JSON.stringify({ error: 'Missing tenant_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get tenant's OneDrive settings
        const { data: settings, error: settingsError } = await supabase
          .from('tenant_onedrive_settings')
          .select('access_token, refresh_token, client_id, client_secret, token_expires_at')
          .eq('tenant_id', tenant_id)
          .single();

        if (settingsError || !settings || !settings.access_token) {
          return new Response(
            JSON.stringify({ success: false, error: 'No valid access token found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Test connection by getting user's drive info using helper function
        try {
          console.log('Testing OneDrive connection...');
          const driveResponse = await makeGraphRequest(supabase, tenant_id, 'https://graph.microsoft.com/v1.0/me/drive');

          if (driveResponse.ok) {
            const driveInfo = await driveResponse.json();
            console.log('Connection test successful');
            return new Response(
              JSON.stringify({ 
                success: true, 
                drive_name: driveInfo.name,
                owner: driveInfo.owner?.user?.displayName 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            const errorData = await driveResponse.json();
            console.error('Connection test failed:', errorData);
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Failed to access OneDrive: ${errorData.error?.message || 'Unknown error'}` 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          console.error('Test connection error:', error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Connection test failed: ${error.message}` 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'get_libraries': {
        if (!tenant_id) {
          return new Response(
            JSON.stringify({ error: 'Missing tenant_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get tenant's OneDrive settings
        const { data: settings, error: settingsError } = await supabase
          .from('tenant_onedrive_settings')
          .select('access_token, refresh_token, client_id, client_secret, token_expires_at')
          .eq('tenant_id', tenant_id)
          .single();

        if (settingsError || !settings || !settings.access_token) {
          return new Response(
            JSON.stringify({ error: 'No valid access token found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Get available sites with document libraries using helper function
          console.log('Fetching SharePoint sites...');
          const sitesResponse = await makeGraphRequest(supabase, tenant_id, 'https://graph.microsoft.com/v1.0/sites?search=*');

          if (!sitesResponse.ok) {
            const sitesError = await sitesResponse.json();
            console.error('Failed to fetch sites:', sitesError);
            throw new Error(`Failed to fetch sites: ${sitesError.error?.message || 'Unknown error'}`);
          }

          const sitesData = await sitesResponse.json();
          const libraries = [];

          // Add the personal OneDrive as default option
          console.log('Fetching personal OneDrive...');
          const driveResponse = await makeGraphRequest(supabase, tenant_id, 'https://graph.microsoft.com/v1.0/me/drive');

          if (driveResponse.ok) {
            const driveData = await driveResponse.json();
            libraries.push({
              id: driveData.id,
              name: `Personal OneDrive (${driveData.owner?.user?.displayName || 'Me'})`,
              type: 'personal',
              webUrl: driveData.webUrl
            });
            console.log('Successfully fetched personal OneDrive');
          } else {
            const driveError = await driveResponse.json();
            console.error('Failed to fetch personal OneDrive:', driveError);
          }

          // Add site document libraries
          console.log(`Processing ${sitesData.value?.length || 0} SharePoint sites...`);
          for (const site of sitesData.value || []) {
            try {
              console.log(`Fetching drives for site: ${site.displayName}`);
              const drivesResponse = await makeGraphRequest(supabase, tenant_id, `https://graph.microsoft.com/v1.0/sites/${site.id}/drives`);

              if (drivesResponse.ok) {
                const drivesData = await drivesResponse.json();
                for (const drive of drivesData.value || []) {
                  if (drive.driveType === 'documentLibrary') {
                    libraries.push({
                      id: drive.id,
                      name: `${site.displayName} - ${drive.name}`,
                      type: 'sharepoint',
                      webUrl: drive.webUrl,
                      siteId: site.id
                    });
                  }
                }
                console.log(`Found ${drivesData.value?.length || 0} drives for site: ${site.displayName}`);
              } else {
                const drivesError = await drivesResponse.json();
                console.log(`Failed to fetch drives for site ${site.displayName}:`, drivesError);
              }
            } catch (error) {
              console.log(`Error fetching drives for site ${site.id}:`, error);
            }
          }

          return new Response(
            JSON.stringify({ libraries }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error fetching libraries:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch document libraries' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'set_library': {
        if (!tenant_id || !library_id || !library_name) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const { error: updateError } = await supabase
            .from('tenant_onedrive_settings')
            .update({
              selected_library_id: library_id,
              selected_library_name: library_name,
              updated_at: new Date().toISOString()
            })
            .eq('tenant_id', tenant_id);

          if (updateError) {
            throw updateError;
          }

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Error setting library:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to set selected library' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('OneDrive Auth Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});