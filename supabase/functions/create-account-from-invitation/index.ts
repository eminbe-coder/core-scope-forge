import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAccountRequest {
  invitation_token: string;
  first_name: string;
  last_name: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Create account from invitation function called');

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

    // Parse request body
    const { invitation_token, first_name, last_name, password }: CreateAccountRequest = await req.json();

    console.log('Create account request:', { invitation_token, first_name, last_name });

    // Validate required fields
    if (!invitation_token || !first_name || !last_name || !password) {
      return new Response(
        JSON.stringify({ error: 'All fields are required: invitation_token, first_name, last_name, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters' }),
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

    // Check if user already exists with this email
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(invitation.email);
    
    let userId: string;

    if (existingUser?.user) {
      // User already exists (possibly created by the invitation email)
      userId = existingUser.user.id;
      console.log('User already exists:', userId);

      // Update their password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: {
          first_name,
          last_name
        }
      });

      if (updateError) {
        console.error('Failed to update user:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name
        }
      });

      if (createError || !newUser.user) {
        console.error('Failed to create user:', createError);
        return new Response(
          JSON.stringify({ error: createError?.message || 'Failed to create account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log('Created new user:', userId);
    }

    // Create or update profile
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: invitation.email,
          first_name,
          last_name
        });

      if (profileError) {
        console.error('Failed to create profile:', profileError);
        // Non-fatal, continue
      }
    } else {
      await supabaseAdmin
        .from('profiles')
        .update({ first_name, last_name })
        .eq('id', userId);
    }

    // Add primary email to user_emails table
    const { data: emailExists } = await supabaseAdmin
      .from('user_emails')
      .select('id')
      .eq('user_id', userId)
      .eq('email', invitation.email)
      .single();

    if (!emailExists) {
      await supabaseAdmin
        .from('user_emails')
        .insert({
          user_id: userId,
          email: invitation.email,
          verified: true,
          is_primary: true
        });
    }

    // Create tenant membership
    const { data: existingMembership } = await supabaseAdmin
      .from('user_tenant_memberships')
      .select('id, active')
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
      }
    } else {
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
          JSON.stringify({ error: 'Failed to add you to the tenant' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('tenant_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    console.log('Successfully created account and accepted invitation for user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account created successfully',
        tenant_name: invitation.tenants.name,
        user_id: userId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-account-from-invitation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
