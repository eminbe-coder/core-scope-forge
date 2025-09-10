-- Add separate country_code and phone_number fields to all tables with phone fields
-- Add country field to tenants table for default country code

-- Add country field to tenants table
ALTER TABLE public.tenants 
ADD COLUMN country text;

-- Add country_code and phone_number fields to contacts
ALTER TABLE public.contacts 
ADD COLUMN country_code text,
ADD COLUMN phone_number text;

-- Add country_code and phone_number fields to companies  
ALTER TABLE public.companies
ADD COLUMN country_code text,
ADD COLUMN phone_number text;

-- Add country_code and phone_number fields to sites
ALTER TABLE public.sites
ADD COLUMN country_code text,
ADD COLUMN phone_number text;

-- Add country_code and phone_number fields to tenants (for contact phone)
ALTER TABLE public.tenants
ADD COLUMN contact_phone_country_code text,
ADD COLUMN contact_phone_number text;

-- Add country_code and phone_number fields to branches
ALTER TABLE public.branches
ADD COLUMN country_code text,
ADD COLUMN phone_number text;