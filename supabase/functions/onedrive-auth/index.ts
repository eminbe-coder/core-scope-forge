import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OneDriveAuthRequest {
  action: 'initialize' | 'callback' | 'test';
  tenant_id?: string;
  client_id?: string;
  client_secret?: string;
  code?: string;
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

    const { action, tenant_id, client_id, client_secret, code } = await req.json() as OneDriveAuthRequest;

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

          // Get OneDrive root folder ID
          const driveResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive/root', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
            },
          });

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
              await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
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
            } catch (error) {
              console.log(`Folder ${folderName} might already exist:`, error);
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

        // Test connection by getting user's drive info
        try {
          const driveResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
            headers: {
              'Authorization': `Bearer ${settings.access_token}`,
            },
          });

          if (driveResponse.ok) {
            const driveInfo = await driveResponse.json();
            return new Response(
              JSON.stringify({ 
                success: true, 
                drive_name: driveInfo.name,
                owner: driveInfo.owner?.user?.displayName 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to access OneDrive' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          console.error('Test connection error:', error);
          return new Response(
            JSON.stringify({ success: false, error: 'Connection test failed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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