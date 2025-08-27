-- Add PKCE support: store code_verifier for OneDrive OAuth
ALTER TABLE public.tenant_onedrive_settings
ADD COLUMN IF NOT EXISTS code_verifier TEXT;