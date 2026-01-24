import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkInvitationRequest {
  invitation_token: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Link invitation to account function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
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
        JSON.stringify({ error: 'Authentication required. Please sign in first.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token to get the current user
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed. Please sign in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id, user.email);

    // Parse request body
    const { invitation_token }: LinkInvitationRequest = await req.json();

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
        tenants (name)
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

    console.log('Found invitation:', invitation.id, 'for email:', invitation.email);

    // Add the invited email as a secondary email for this user (if different from primary)
    if (user.email !== invitation.email) {
      // Check if this email is already linked to another user
      const { data: existingEmail } = await supabaseAdmin
        .from('user_emails')
        .select('user_id')
        .eq('email', invitation.email)
        .single();

      if (existingEmail && existingEmail.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'This email is already linked to another account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add the secondary email if not already linked
      if (!existingEmail) {
        const { error: emailError } = await supabaseAdmin
          .from('user_emails')
          .insert({
            user_id: user.id,
            email: invitation.email,
            verified: true, // Verified through invitation acceptance
            is_primary: false
          });

        if (emailError) {
          console.error('Failed to add secondary email:', emailError);
          // Non-fatal, continue with membership creation
        } else {
          console.log('Added secondary email:', invitation.email, 'for user:', user.id);
        }
      }
    }

    // Also ensure the user's primary email is in user_emails
    const { data: primaryEmailExists } = await supabaseAdmin
      .from('user_emails')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', user.email)
      .single();

    if (!primaryEmailExists) {
      await supabaseAdmin
        .from('user_emails')
        .insert({
          user_id: user.id,
          email: user.email,
          verified: true,
          is_primary: true
        });
    }

    // Check if user already has membership for this tenant
    const { data: existingMembership } = await supabaseAdmin
      .from('user_tenant_memberships')
      .select('id, active')
      .eq('user_id', user.id)
      .eq('tenant_id', invitation.tenant_id)
      .single();

    if (existingMembership && existingMembership.active) {
      // Already a member, just mark invitation as accepted
      await supabaseAdmin
        .from('tenant_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'You are already a member of this tenant',
          tenant_name: invitation.tenants.name
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingMembership && !existingMembership.active) {
      // Reactivate membership
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
        console.error('Failed to reactivate membership:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to add you to the tenant' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new membership
      const { error: membershipError } = await supabaseAdmin
        .from('user_tenant_memberships')
        .insert({
          user_id: user.id,
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
    await supabaseAdmin
      .from('tenant_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    console.log('Successfully linked invitation to user:', user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation accepted and linked to your account',
        tenant_name: invitation.tenants.name,
        secondary_email_added: user.email !== invitation.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in link-invitation-to-account function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
