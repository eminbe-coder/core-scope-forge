-- Add Instagram and LinkedIn page fields to companies table
ALTER TABLE public.companies 
ADD COLUMN instagram_page text,
ADD COLUMN linkedin_page text;

-- Add comments for clarity
COMMENT ON COLUMN public.companies.instagram_page IS 'Company Instagram page URL';
COMMENT ON COLUMN public.companies.linkedin_page IS 'Company LinkedIn page URL';