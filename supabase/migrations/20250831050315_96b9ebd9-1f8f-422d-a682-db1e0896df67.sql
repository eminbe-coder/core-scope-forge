-- Add high_value column to companies, contacts, sites, and deals tables
ALTER TABLE public.companies 
ADD COLUMN high_value boolean NOT NULL DEFAULT false;

ALTER TABLE public.contacts 
ADD COLUMN high_value boolean NOT NULL DEFAULT false;

ALTER TABLE public.sites 
ADD COLUMN high_value boolean NOT NULL DEFAULT false;

ALTER TABLE public.deals 
ADD COLUMN high_value boolean NOT NULL DEFAULT false;

-- Add indexes for better performance when filtering by high_value
CREATE INDEX idx_companies_high_value ON public.companies(high_value, tenant_id);
CREATE INDEX idx_contacts_high_value ON public.contacts(high_value, tenant_id);
CREATE INDEX idx_sites_high_value ON public.sites(high_value, tenant_id);
CREATE INDEX idx_deals_high_value ON public.deals(high_value, tenant_id);