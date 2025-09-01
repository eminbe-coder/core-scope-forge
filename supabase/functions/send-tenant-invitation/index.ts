import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Create invitation record
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

    // Send invitation email
    const invitationUrl = `${req.headers.get('origin')}/accept-invitation?token=${invitation.invitation_token}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join ${tenant.name}</h2>
        <p>Hello,</p>
        <p>You've been invited to join <strong>${tenant.name}</strong> as a <strong>${role}</strong>.</p>
        <p>Click the button below to accept your invitation:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${invitationUrl}</p>
        <p>This invitation will expire in 7 days.</p>
        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: 'CRM System <onboarding@resend.dev>',
      to: [email],
      subject: `Invitation to join ${tenant.name}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    console.log('Invitation sent successfully:', invitation.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation_id: invitation.id,
        message: 'Invitation sent successfully'
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