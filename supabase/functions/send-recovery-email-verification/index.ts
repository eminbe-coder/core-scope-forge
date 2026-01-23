import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  recoveryEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Invalid token");
    }

    const { recoveryEmail }: VerificationRequest = await req.json();

    if (!recoveryEmail || !recoveryEmail.includes("@")) {
      throw new Error("Invalid recovery email address");
    }

    // Check if this recovery email is already used by someone else
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("recovery_email", recoveryEmail)
      .neq("id", user.id)
      .single();

    if (existingProfile) {
      throw new Error("This email is already used as a recovery email by another account");
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        recovery_email: recoveryEmail,
        is_recovery_email_verified: false,
        recovery_email_verification_token: verificationToken,
        recovery_email_token_expires_at: expiresAt.toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      throw new Error("Failed to save recovery email");
    }

    // Build verification URL
    const baseUrl = req.headers.get("origin") || "https://system-integrator-dream.lovable.app";
    const verificationUrl = `${baseUrl}/verify-recovery-email?token=${verificationToken}`;

    // Send verification email
    const emailResponse = await resend.emails.send({
      from: "System Integrator Dream <onboarding@resend.dev>",
      to: [recoveryEmail],
      subject: "Verify your recovery email",
      html: `
        <h1>Verify Your Recovery Email</h1>
        <p>You've added this email as a recovery email for your System Integrator Dream account.</p>
        <p>Click the button below to verify this email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Recovery Email
        </a>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    console.log("Verification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Verification email sent" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-recovery-email-verification:", error);
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
