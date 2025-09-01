// Supabase Edge Function: admin-reset-user-password
// Securely reset a user's password using the service role, with tenant admin/super_admin authorization

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ResetPasswordRequest = {
  user_id: string;
  tenant_id: string;
  new_password: string;
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Client scoped to the caller (for auth) and admin client (for privileged ops)
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Partial<ResetPasswordRequest>;
    const user_id = body.user_id;
    const tenant_id = body.tenant_id;
    const new_password = body.new_password;

    if (!user_id || !tenant_id || !new_password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: caller must be super_admin OR admin in the same tenant
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("user_tenant_memberships")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("tenant_id", tenant_id)
      .eq("active", true)
      .limit(1);

    if (membershipError) {
      console.error("Membership check error:", membershipError);
      return new Response(JSON.stringify({ error: "Permission check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = memberships?.[0]?.role as string | undefined;
    if (!(callerRole === "admin" || callerRole === "super_admin")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure the target user belongs to the same tenant
    const { data: targetMembership, error: targetMembershipError } = await supabaseAdmin
      .from("user_tenant_memberships")
      .select("id")
      .eq("user_id", user_id)
      .eq("tenant_id", tenant_id)
      .eq("active", true)
      .limit(1)
      .single();

    if (targetMembershipError || !targetMembership) {
      return new Response(JSON.stringify({ error: "Target user is not a member of this tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update password via Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});