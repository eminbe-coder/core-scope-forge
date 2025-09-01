import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptInvitationRequest {
  invitation_token: string;
  first_name?: string;
  last_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Accept tenant invitation function called');

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

    // Parse request body
    const { invitation_token, first_name, last_name }: AcceptInvitationRequest = await req.json();

    console.log('Accept invitation request:', { invitation_token, first_name, last_name });

    // Validate required fields
    if (!invitation_token) {
      return new Response(
        JSON.stringify({ error: 'Invitation token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('tenant_invitations')
      .select(`
        *,
        tenants (name),
        custom_roles (name)
      `)
      .eq('invitation_token', invitation_token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invitationError || !invitation) {
      console.error('Invalid or expired invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The user should already exist from the Supabase Auth invitation
    // Look them up by email
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(invitation.email);
    
    if (!existingUser.user) {
      console.error('User not found after invitation:', invitation.email);
      return new Response(
        JSON.stringify({ error: 'User account not found. Please check your invitation email and try the signup link first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = existingUser.user.id;
    console.log('Found existing user from auth invitation:', userId);

    // Ensure profile exists for the user
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      console.log('Creating profile for user:', userId);
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: invitation.email,
          first_name: first_name || existingUser.user.user_metadata?.first_name || '',
          last_name: last_name || existingUser.user.user_metadata?.last_name || ''
        });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        // Don't fail the request, but log the error
      }
    } else if (first_name || last_name) {
      // Update profile with provided names
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: first_name || existingProfile.first_name,
          last_name: last_name || existingProfile.last_name
        })
        .eq('id', userId);

      if (updateProfileError) {
        console.error('Failed to update profile:', updateProfileError);
      }
    }

    // Check if user already has membership for this tenant
    const { data: existingMembership } = await supabaseAdmin
      .from('user_tenant_memberships')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', invitation.tenant_id)
      .single();

    if (existingMembership) {
      // Update existing membership
      const { error: updateError } = await supabaseAdmin
        .from('user_tenant_memberships')
        .update({
          role: invitation.role,
          custom_role_id: invitation.custom_role_id,
          active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMembership.id);

      if (updateError) {
        console.error('Failed to update membership:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update tenant membership' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new tenant membership
      const { error: membershipError } = await supabaseAdmin
        .from('user_tenant_memberships')
        .insert({
          user_id: userId,
          tenant_id: invitation.tenant_id,
          role: invitation.role,
          custom_role_id: invitation.custom_role_id,
          active: true
        });

      if (membershipError) {
        console.error('Failed to create membership:', membershipError);
        return new Response(
          JSON.stringify({ error: 'Failed to create tenant membership' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabaseAdmin
      .from('tenant_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (acceptError) {
      console.error('Failed to mark invitation as accepted:', acceptError);
    }

    console.log('Invitation accepted successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation accepted successfully',
        tenant_name: invitation.tenants.name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in accept-tenant-invitation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);