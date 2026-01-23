import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token }: VerifyRequest = await req.json();

    if (!token) {
      throw new Error("No verification token provided");
    }

    // Find profile with this token
    const { data: profile, error: findError } = await supabase
      .from("profiles")
      .select("id, recovery_email, recovery_email_token_expires_at")
      .eq("recovery_email_verification_token", token)
      .single();

    if (findError || !profile) {
      throw new Error("Invalid or expired verification token");
    }

    // Check if token is expired
    const expiresAt = new Date(profile.recovery_email_token_expires_at);
    if (expiresAt < new Date()) {
      throw new Error("Verification token has expired. Please request a new one.");
    }

    // Mark as verified and clear token
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_recovery_email_verified: true,
        recovery_email_verification_token: null,
        recovery_email_token_expires_at: null,
      })
      .eq("id", profile.id);

    if (updateError) {
      throw new Error("Failed to verify recovery email");
    }

    console.log("Recovery email verified for profile:", profile.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Recovery email verified successfully",
        recoveryEmail: profile.recovery_email 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-recovery-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
