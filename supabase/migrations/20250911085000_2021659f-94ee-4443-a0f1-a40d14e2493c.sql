-- Add source tracking columns to sites table for lead functionality
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS source_id uuid,
ADD COLUMN IF NOT EXISTS source_company_id uuid,
ADD COLUMN IF NOT EXISTS source_contact_id uuid,
ADD COLUMN IF NOT EXISTS source_user_id uuid;