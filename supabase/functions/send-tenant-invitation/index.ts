import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  email: string;
  role: string;
  custom_role_id?: string;
  tenant_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send tenant invitation function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { email, role, custom_role_id, tenant_id }: InvitationRequest = await req.json();

    console.log('Invitation request:', { email, role, tenant_id, custom_role_id });

    // Validate required fields
    if (!email || !role || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Email, role, and tenant_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the user is an admin for this tenant
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('user_tenant_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .single();

    if (membershipError || !membership || !['admin', 'super_admin'].includes(membership.role)) {
      console.error('Permission denied:', membershipError);
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const { data: existingUser, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === email);

    if (userExists) {
      console.log('User already exists, adding to tenant directly:', email);
      
      // Check if user already has membership in this tenant
      const { data: existingMembership, error: membershipCheckError } = await supabaseAdmin
        .from('user_tenant_memberships')
        .select('id, active')
        .eq('user_id', userExists.id)
        .eq('tenant_id', tenant_id)
        .single();

      if (existingMembership && existingMembership.active) {
        return new Response(
          JSON.stringify({ error: 'User is already a member of this tenant' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create or reactivate membership
      if (existingMembership && !existingMembership.active) {
        // Reactivate existing membership
        const { error: updateError } = await supabaseAdmin
          .from('user_tenant_memberships')
          .update({
            role,
            custom_role_id,
            active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMembership.id);

        if (updateError) {
          console.error('Failed to reactivate membership:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to add user to tenant' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // Create new membership
        const { error: membershipError } = await supabaseAdmin
          .from('user_tenant_memberships')
          .insert({
            user_id: userExists.id,
            tenant_id,
            role,
            custom_role_id,
            active: true
          });

        if (membershipError) {
          console.error('Failed to create membership:', membershipError);
          return new Response(
            JSON.stringify({ error: 'Failed to add user to tenant' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Existing user added to tenant successfully',
          user_id: userExists.id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // User doesn't exist, proceed with invitation
    // Create invitation record first
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('tenant_invitations')
      .insert({
        tenant_id,
        email,
        role,
        custom_role_id,
        invited_by: user.id
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Failed to create invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use claim-invitation page instead of set-password for better UX
    const origin = req.headers.get('origin') || 'https://711f9ef4-fcf3-4a93-9e36-e236d2f8e210.sandbox.lovable.dev';
    const redirectUrl = `${origin}/claim-invitation?token=${invitation.invitation_token}`;
    
    const { data: authInvite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectUrl,
        data: {
          tenant_id,
          role,
          custom_role_id,
          invitation_token: invitation.invitation_token,
          tenant_name: tenant.name
        }
      }
    );

    if (inviteError) {
      console.error('Failed to send auth invitation:', inviteError);
      // Clean up the invitation record if auth invitation fails
      await supabaseAdmin
        .from('tenant_invitations')
        .delete()
        .eq('id', invitation.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invitation sent successfully:', invitation.id, 'Auth invite:', authInvite);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation_id: invitation.id,
        auth_user_id: authInvite?.user?.id,
        message: 'Invitation sent successfully via Supabase Auth'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-tenant-invitation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);