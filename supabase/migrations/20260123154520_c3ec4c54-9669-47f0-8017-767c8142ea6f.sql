-- =============================================
-- PROFILE SECURITY: Recovery Email Feature
-- Priority: High - Protect global profiles
-- =============================================

-- 1. Add recovery email columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS recovery_email TEXT,
ADD COLUMN IF NOT EXISTS is_recovery_email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recovery_email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS recovery_email_token_expires_at TIMESTAMPTZ;

-- Add unique constraint for recovery_email (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_recovery_email_unique 
ON public.profiles(recovery_email) WHERE recovery_email IS NOT NULL;

-- Document the recovery email pattern
COMMENT ON COLUMN public.profiles.recovery_email IS 'Personal recovery email for account access if work email is lost. Must be verified.';
COMMENT ON COLUMN public.profiles.is_recovery_email_verified IS 'Whether the recovery email has been verified via confirmation link.';
COMMENT ON COLUMN public.profiles.recovery_email_verification_token IS 'Token for verifying recovery email ownership.';
COMMENT ON COLUMN public.profiles.recovery_email_token_expires_at IS 'Expiration time for the verification token.';

-- 2. JOB CHANGE LOGIC: Ensure removing from tenant doesn't delete user
-- Add a comment documenting this important rule
COMMENT ON TABLE public.user_tenant_memberships IS 
'Tenant-specific employment data. IMPORTANT: Deleting a membership does NOT delete the user from auth.users or profiles. The user simply loses access to that tenant dashboard.';