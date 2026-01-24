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

    // Check if there's a logged-in user via Authorization header
    const authHeader = req.headers.get('Authorization');
    let sessionUser = null;
    
    if (authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
      if (!authError && user) {
        sessionUser = user;
        console.log('Session user detected:', user.id, user.email);
      }
    }

    // Determine which user ID to use
    let userId: string;
    let userEmail: string;
    
    if (sessionUser) {
      // Use the logged-in user's ID (linking scenario)
      userId = sessionUser.id;
      userEmail = sessionUser.email!;
      console.log('Using session user for membership:', userId);
      
      // Add secondary email if different from session user's email
      if (sessionUser.email !== invitation.email) {
        // Check if this email is already linked to another user
        const { data: existingEmail } = await supabaseAdmin
          .from('user_emails')
          .select('user_id')
          .eq('email', invitation.email)
          .single();

        if (existingEmail && existingEmail.user_id !== sessionUser.id) {
          return new Response(
            JSON.stringify({ error: 'This invited email is already linked to another account' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add the secondary email if not already linked
        if (!existingEmail) {
          const { error: emailError } = await supabaseAdmin
            .from('user_emails')
            .insert({
              user_id: sessionUser.id,
              email: invitation.email,
              verified: true,
              is_primary: false
            });

          if (emailError) {
            console.error('Failed to add secondary email:', emailError);
            // Non-fatal, continue with membership creation
          } else {
            console.log('Added secondary email:', invitation.email, 'for user:', sessionUser.id);
          }
        }
      }
    } else {
      // No session user - look up by email (original flow)
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(invitation.email);
      
      if (!existingUser.user) {
        console.error('User not found after invitation:', invitation.email);
        return new Response(
          JSON.stringify({ error: 'User account not found. Please check your invitation email and try the signup link first.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = existingUser.user.id;
      userEmail = invitation.email;
      console.log('Found existing user from auth invitation:', userId);
    }

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
          email: userEmail,
          first_name: first_name || sessionUser?.user_metadata?.first_name || '',
          last_name: last_name || sessionUser?.user_metadata?.last_name || ''
        });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        // Don't fail the request, but log the error
      }
    } else if (first_name || last_name) {
      // Update profile with provided names if given
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name: first_name,
          last_name: last_name
        })
        .eq('id', userId);

      if (updateProfileError) {
        console.error('Failed to update profile:', updateProfileError);
      }
    }

    // Ensure user's primary email is in user_emails
    const { data: primaryEmailExists } = await supabaseAdmin
      .from('user_emails')
      .select('id')
      .eq('user_id', userId)
      .eq('email', userEmail)
      .single();

    if (!primaryEmailExists) {
      await supabaseAdmin
        .from('user_emails')
        .insert({
          user_id: userId,
          email: userEmail,
          verified: true,
          is_primary: true
        });
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

    console.log('Invitation accepted successfully for user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation accepted successfully',
        tenant_name: invitation.tenants.name,
        secondary_email_added: sessionUser ? sessionUser.email !== invitation.email : false
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
