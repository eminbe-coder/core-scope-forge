-- Rename is_deal to is_lead in sites table
ALTER TABLE public.sites 
RENAME COLUMN is_deal TO is_lead;

-- Add is_lead column to companies table
ALTER TABLE public.companies 
ADD COLUMN is_lead boolean DEFAULT false;

-- Update comments
COMMENT ON COLUMN public.sites.is_lead IS 'Flag indicating if this site is marked as a lead';
COMMENT ON COLUMN public.companies.is_lead IS 'Flag indicating if this company is marked as a lead';
COMMENT ON COLUMN public.contacts.is_lead IS 'Flag indicating if this contact is marked as a lead';