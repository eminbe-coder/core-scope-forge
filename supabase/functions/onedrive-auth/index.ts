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
async function refreshAccessToken(
  supabase: any,
  tenant_id: string,
  refresh_token: string,
  client_id: string,
  client_secret: string,
  azureTenantId?: string,
  scope: string = 'https://graph.microsoft.com/.default offline_access'
) {
  console.log(`Refreshing access token for tenant: ${tenant_id} (PKCE: using v2.0 endpoint)`);

  const authority = azureTenantId && azureTenantId.trim().length > 0 ? azureTenantId : 'common';
  const tokenUrl = `https://login.microsoftonline.com/${authority}/oauth2/v2.0/token`;

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
      scope,
    }),
  });

  const tokenData = await response.json();

  if (!response.ok) {
    console.error('Token refresh error:', tokenData);
    throw new Error(`Token refresh failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`);
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
        settings.client_secret,
        settings.azure_tenant_id
      );
    }
  }

  // Prepare headers with authorization
  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${accessToken}`
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
        settings.client_secret,
        settings.azure_tenant_id
      );

      // Retry the request with new token
      const retryHeaders = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${accessToken}`
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

    // For POST requests, validate JWT token and extract user context
    if (req.method === 'POST') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Missing or invalid authorization header');
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Validate JWT token using Supabase client
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('Invalid JWT token:', authError);
        return new Response(
          JSON.stringify({ error: 'Invalid or expired token' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`Authenticated user: ${user.id}`);
      
      // Parse request body
      const requestBody = await req.json();
      const { action, tenant_id } = requestBody as OneDriveAuthRequest;

      // Verify user has access to the specified tenant
      if (tenant_id) {
        const { data: membership, error: membershipError } = await supabase
          .from('user_tenant_memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('tenant_id', tenant_id)
          .eq('active', true)
          .single();

        if (membershipError || !membership) {
          console.error('User does not have access to tenant:', { user_id: user.id, tenant_id });
          return new Response(
            JSON.stringify({ error: 'Access denied to tenant' }),
            { 
              status: 403, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log(`User ${user.id} has ${membership.role} access to tenant ${tenant_id}`);
      }

      // Handle different actions based on the request
      return await handlePostAction(supabase, requestBody);
    }

    // Handle GET requests (OAuth callback from Microsoft)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const authCode = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      console.log(`OneDrive Auth - OAuth callback received - Code: ${authCode ? 'present' : 'missing'}, State: ${state ? 'present' : 'missing'}, Error: ${error || 'none'}`);

      if (error) {
        console.error('OAuth error:', error);
        return new Response(
          `<html><body><script>window.close();</script><p>Authentication failed: ${error}</p></body></html>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      if (!authCode || !state) {
        console.error('OAuth callback missing required parameters:', { 
          hasCode: !!authCode, 
          hasState: !!state,
          url: req.url 
        });
        return new Response(
          '<html><body><script>window.close();</script><p>Missing authorization code or state</p></body></html>',
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      try {
        // Validate and decode state parameter
        let decodedState;
        try {
          decodedState = JSON.parse(atob(state));
          console.log('State parameter decoded successfully');
        } catch (stateError) {
          console.error('Invalid state parameter - not valid base64 or JSON:', stateError);
          return new Response(
            '<html><body><script>window.close();</script><p>Invalid state parameter. Please try connecting again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        // Validate state structure
        const { tenant_id } = decodedState;
        if (!tenant_id || typeof tenant_id !== 'string' || tenant_id.trim().length === 0) {
          console.error('Invalid tenant_id in state:', { tenant_id, decodedState });
          return new Response(
            '<html><body><script>window.close();</script><p>Invalid tenant ID in state parameter. Please try connecting again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        console.log(`Processing OAuth callback for tenant: ${tenant_id}`);

        // Get tenant's OneDrive settings
        const { data: settings, error: settingsError } = await supabase
          .from('tenant_onedrive_settings')
          .select('client_id, client_secret, code_verifier')
          .eq('tenant_id', tenant_id)
          .single();

        if (settingsError || !settings) {
          console.error('Settings error:', settingsError);
          return new Response(
            '<html><body><script>window.close();</script><p>Tenant settings not found</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }
        if (!settings.code_verifier) {
          console.error('PKCE code_verifier missing for tenant during callback');
          return new Response(
            '<html><body><script>window.close();</script><p>PKCE validation failed: code_verifier not found. Please try connecting again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        // Exchange code for tokens with enhanced error handling
        const authority = settings.azure_tenant_id && settings.azure_tenant_id.trim().length > 0 ? settings.azure_tenant_id : 'common';
        const tokenUrl = `https://login.microsoftonline.com/${authority}/oauth2/v2.0/token`;
        
        // Construct redirect URI to match what was registered in Azure AD
        const baseUrl = Deno.env.get('SUPABASE_URL');
        if (!baseUrl) {
          console.error('SUPABASE_URL environment variable not set');
          return new Response(
            '<html><body><script>window.close();</script><p>Server configuration error</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }
        
        const redirectUri = `${baseUrl}/functions/v1/onedrive-auth`;
        const scope = 'https://graph.microsoft.com/.default offline_access';

        console.log(`Exchanging authorization code for access token...`);
        console.log(`Using redirect URI: ${redirectUri}`);
        console.log(`Using authority: ${authority}`);
        console.log(`Using token URL: ${tokenUrl}`);

        let tokenResponse;
        let responseText = '';
        
        try {
          tokenResponse = await fetch(tokenUrl, {
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
              code_verifier: settings.code_verifier,
              scope,
            }),
          });

          // Always get the response text first for logging
          responseText = await tokenResponse.text();
          console.log(`Token exchange response status: ${tokenResponse.status}`);
          console.log(`Token exchange response headers:`, Object.fromEntries(tokenResponse.headers.entries()));
          
        } catch (networkError) {
          console.error('Network error during token exchange:', networkError);
          return new Response(
            '<html><body><script>window.close();</script><p>Network error during authentication. Please check your connection and try again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        let tokenData;
        try {
          tokenData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse token response as JSON:', parseError);
          console.error('Raw token response:', responseText);
          return new Response(
            '<html><body><script>window.close();</script><p>Invalid response from Microsoft. Please try connecting again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        if (!tokenResponse.ok) {
          console.error('Token exchange failed with status:', tokenResponse.status);
          console.error('Token exchange error details:', tokenData);
          console.error('Raw response text:', responseText);
          
          // Handle specific error cases
          let errorMessage = 'Authentication failed';
          
          if (tokenData.error === 'invalid_grant') {
            if (tokenData.error_description?.includes('AADSTS70008')) {
              errorMessage = 'Authorization code expired or already used. Please try connecting again.';
            } else if (tokenData.error_description?.includes('AADSTS50011')) {
              errorMessage = 'Redirect URI mismatch. Please contact support.';
            } else {
              errorMessage = 'Invalid authorization code. Please try connecting again.';
            }
          } else if (tokenData.error === 'invalid_client') {
            errorMessage = 'Invalid client credentials. Please check your app registration.';
          } else if (tokenData.error === 'invalid_request') {
            errorMessage = 'Invalid request parameters. Please try connecting again.';
          }
          
          const safeMsg = tokenData.error_description || tokenData.error || errorMessage;
          console.error(`Returning error message to user: ${safeMsg}`);
          
          return new Response(
            `<html><body><script>window.close();</script><p>${errorMessage}</p></body></html>`,
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        // Validate that we received the required tokens
        if (!tokenData.access_token) {
          console.error('Token exchange succeeded but no access token received:', tokenData);
          return new Response(
            '<html><body><script>window.close();</script><p>No access token received from Microsoft. Please try connecting again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        console.log('Token exchange successful - access token received');

        // Get OneDrive root folder ID with better error handling
        console.log('Getting OneDrive root folder...');
        let driveResponse;
        let driveResponseText = '';
        
        try {
          driveResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive/root', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
            },
          });
          
          driveResponseText = await driveResponse.text();
          
        } catch (networkError) {
          console.error('Network error accessing OneDrive:', networkError);
          return new Response(
            '<html><body><script>window.close();</script><p>Failed to connect to OneDrive. Please check your connection and try again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        if (!driveResponse.ok) {
          console.error('Failed to get drive root - status:', driveResponse.status);
          console.error('Drive root response text:', driveResponseText);
          
          let driveErrorData;
          try {
            driveErrorData = JSON.parse(driveResponseText);
            console.error('Drive root error details:', driveErrorData);
          } catch (parseError) {
            console.error('Failed to parse drive error response');
          }
          
          return new Response(
            '<html><body><script>window.close();</script><p>Failed to access OneDrive. Please ensure you have proper permissions and try again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }

        let driveData;
        try {
          driveData = JSON.parse(driveResponseText);
        } catch (parseError) {
          console.error('Failed to parse drive response as JSON:', parseError);
          console.error('Raw drive response:', driveResponseText);
          return new Response(
            '<html><body><script>window.close();</script><p>Invalid response from OneDrive. Please try connecting again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }
        
        const rootFolderId = driveData.id;
        if (!rootFolderId) {
          console.error('No root folder ID received from OneDrive:', driveData);
          return new Response(
            '<html><body><script>window.close();</script><p>Failed to get OneDrive folder information. Please try connecting again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }
        
        console.log(`OneDrive root folder ID obtained: ${rootFolderId}`);

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

        // Save tokens to database securely
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        console.log('Saving authentication tokens to database...');
        const { error: updateError } = await supabase
          .from('tenant_onedrive_settings')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null, // Handle case where refresh token might not be provided
            token_expires_at: expiresAt.toISOString(),
            root_folder_id: rootFolderId,
            folder_structure: folderStructure,
            code_verifier: null, // Clear the code verifier after successful exchange
            connected_at: new Date().toISOString(),
            last_sync_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenant_id);

        if (updateError) {
          console.error('Database update error:', updateError);
          console.error('Failed to save tokens for tenant:', tenant_id);
          return new Response(
            '<html><body><script>window.close();</script><p>Failed to save authentication tokens. Please try connecting again.</p></body></html>',
            { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }
        
        console.log('Authentication tokens saved successfully');

        console.log('OneDrive connection completed successfully');
        return new Response(
          '<html><body><script>window.close();</script><p>OneDrive connected successfully!</p></body></html>',
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );

      } catch (error) {
        console.error('Callback processing error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          tenant_id: state ? 'present' : 'missing',
          auth_code: authCode ? 'present' : 'missing'
        });
        
        // Provide more specific error messages based on error type
        let errorMessage = 'Authentication processing failed. Please try connecting again.';
        
        if (error.message?.includes('Token refresh failed')) {
          errorMessage = 'Token refresh failed. Please try connecting again.';
        } else if (error.message?.includes('Failed to access OneDrive')) {
          errorMessage = 'Failed to access OneDrive. Please check your permissions and try again.';
        } else if (error.message?.includes('Database')) {
          errorMessage = 'Failed to save authentication data. Please try connecting again.';
        }
        
        return new Response(
          `<html><body><script>window.close();</script><p>${errorMessage}</p></body></html>`,
          { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }
    }

    // Handle POST requests (API actions) - this was moved to handlePostAction function
    throw new Error('Unexpected method or action');

  } catch (error) {
    console.error('OneDrive Auth Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Handle POST actions (moved from main serve function)
async function handlePostAction(supabase: any, requestBody: OneDriveAuthRequest) {
  const { action, tenant_id, client_id, client_secret, code, library_id, library_name } = requestBody;

  console.log(`OneDrive Auth - Action: ${action}, Tenant: ${tenant_id}`);

  switch (action) {
    case 'initialize': {
      if (!tenant_id || !client_id || !client_secret) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate PKCE code_verifier and code_challenge
      const randomBytes = new Uint8Array(64);
      crypto.getRandomValues(randomBytes);
      const codeVerifier = btoa(String.fromCharCode(...randomBytes))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');

      const encoder = new TextEncoder();
      const hashed = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashed)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');

      // Log PKCE info without sensitive values
      console.log(`PKCE prepared (verifier length: ${codeVerifier.length}, method: S256)`);

      // Persist code_verifier for this tenant to use during token exchange
      const { error: pkceSaveError } = await supabase
        .from('tenant_onedrive_settings')
        .update({
          code_verifier: codeVerifier,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenant_id);

      if (pkceSaveError) {
        console.error('Failed to persist PKCE code_verifier:', pkceSaveError);
        return new Response(
          JSON.stringify({ error: 'Failed to initialize OneDrive auth (PKCE save failed)' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate OAuth URL with PKCE and enhanced state
      const baseUrl = Deno.env.get('SUPABASE_URL');
      if (!baseUrl) {
        console.error('SUPABASE_URL environment variable not set');
        return new Response(
          JSON.stringify({ error: 'Server configuration error - missing SUPABASE_URL' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const redirectUri = `${baseUrl}/functions/v1/onedrive-auth`;
      const scope = 'Files.ReadWrite Files.ReadWrite.All offline_access';
      
      // Include timestamp and nonce for additional security
      const stateData = {
        tenant_id,
        timestamp: Date.now(),
        nonce: crypto.randomUUID()
      };
      const state = btoa(JSON.stringify(stateData));
      
      console.log('Generated OAuth URL with enhanced state parameter');
      console.log(`Redirect URI: ${redirectUri}`);

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${encodeURIComponent(client_id)}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${encodeURIComponent(state)}&` +
        `response_mode=query&` +
        `code_challenge=${encodeURIComponent(codeChallenge)}&` +
        `code_challenge_method=S256`;

      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

        console.log(`Found ${libraries.length} total libraries`);
        return new Response(
          JSON.stringify({ libraries }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Get libraries error:', error);
        return new Response(
          JSON.stringify({ error: `Failed to fetch libraries: ${error.message}` }),
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
        // Update the selected library in the database
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

        console.log(`Library ${library_name} (${library_id}) selected for tenant ${tenant_id}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Set library error:', error);
        return new Response(
          JSON.stringify({ error: `Failed to set library: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    default:
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
}
        if (!tenant_id || !client_id || !client_secret) {
          return new Response(
            JSON.stringify({ error: 'Missing required parameters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate PKCE code_verifier and code_challenge
        const randomBytes = new Uint8Array(64);
        crypto.getRandomValues(randomBytes);
        const codeVerifier = btoa(String.fromCharCode(...randomBytes))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');

        const encoder = new TextEncoder();
        const hashed = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
        const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashed)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');

        // Log PKCE info without sensitive values
        console.log(`PKCE prepared (verifier length: ${codeVerifier.length}, method: S256)`);

        // Persist code_verifier for this tenant to use during token exchange
        const { error: pkceSaveError } = await supabase
          .from('tenant_onedrive_settings')
          .update({
            code_verifier: codeVerifier,
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenant_id);

        if (pkceSaveError) {
          console.error('Failed to persist PKCE code_verifier:', pkceSaveError);
          return new Response(
            JSON.stringify({ error: 'Failed to initialize OneDrive auth (PKCE save failed)' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate OAuth URL with PKCE and enhanced state
        const baseUrl = Deno.env.get('SUPABASE_URL');
        if (!baseUrl) {
          console.error('SUPABASE_URL environment variable not set');
          return new Response(
            JSON.stringify({ error: 'Server configuration error - missing SUPABASE_URL' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const redirectUri = `${baseUrl}/functions/v1/onedrive-auth`;
        const scope = 'Files.ReadWrite Files.ReadWrite.All offline_access';
        
        // Include timestamp and nonce for additional security
        const stateData = {
          tenant_id,
          timestamp: Date.now(),
          nonce: crypto.randomUUID()
        };
        const state = btoa(JSON.stringify(stateData));
        
        console.log('Generated OAuth URL with enhanced state parameter');
        console.log(`Redirect URI: ${redirectUri}`);

        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
          `client_id=${encodeURIComponent(client_id)}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scope)}&` +
          `state=${encodeURIComponent(state)}&` +
          `response_mode=query&` +
          `code_challenge=${encodeURIComponent(codeChallenge)}&` +
          `code_challenge_method=S256`;

        return new Response(
          JSON.stringify({ auth_url: authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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