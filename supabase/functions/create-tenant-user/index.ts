import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Verify the user is authenticated and is a super admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the request body to get tenant_id first
    const { email, first_name, last_name, role, custom_role_id, tenant_id } = await req.json()

    // Validate required fields (password no longer required - using invitation flow)
    if (!email || !first_name || !last_name || !role || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, first_name, last_name, role, tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is super admin OR admin for the specific tenant
    const { data: userMemberships, error: roleError } = await supabaseAdmin
      .from('user_tenant_memberships')
      .select('role, tenant_id')
      .eq('user_id', user.id)
      .eq('active', true)
      .in('role', ['super_admin', 'admin'])

    if (roleError || !userMemberships || userMemberships.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is super admin or admin for the target tenant
    const isSuperAdmin = userMemberships.some(membership => membership.role === 'super_admin')
    const isTenantAdmin = userMemberships.some(membership => 
      membership.role === 'admin' && membership.tenant_id === tenant_id
    )

    if (!isSuperAdmin && !isTenantAdmin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for this tenant' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }


    // Get tenant name for the invitation email
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single()

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // First, create an invitation record in tenant_invitations table
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('tenant_invitations')
      .insert({
        tenant_id,
        email,
        role,
        custom_role_id: custom_role_id || null,
        invited_by: user.id
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Failed to create invitation record:', invitationError)
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation record: ' + invitationError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the origin for redirect URL
    const origin = req.headers.get('origin') || 'https://system-integrator-dream.lovable.app'
    const redirectUrl = `${origin}/accept-invitation?token=${invitation.invitation_token}`

    console.log('Sending invitation with redirect URL:', redirectUrl)

    // Use inviteUserByEmail to send the official Supabase invitation email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectUrl,
        data: {
          first_name,
          last_name,
          tenant_id,
          tenant_name: tenant.name,
          role,
          custom_role_id: custom_role_id || null,
          invitation_token: invitation.invitation_token
        }
      }
    )

    if (inviteError) {
      console.error('Failed to send invitation email:', inviteError)
      // Clean up the invitation record
      await supabaseAdmin
        .from('tenant_invitations')
        .delete()
        .eq('id', invitation.id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email: ' + inviteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Invitation sent successfully:', inviteData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        invitation_id: invitation.id,
        user: {
          id: inviteData.user?.id,
          email,
          first_name,
          last_name,
          role
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})