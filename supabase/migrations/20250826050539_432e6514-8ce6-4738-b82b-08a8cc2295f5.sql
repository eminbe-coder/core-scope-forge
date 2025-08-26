-- Add new fields to sites table
ALTER TABLE public.sites 
ADD COLUMN contact_id uuid,
ADD COLUMN company_id uuid,
ADD COLUMN is_deal boolean DEFAULT false,
ADD COLUMN images text[];

-- Make country field required by removing default null
ALTER TABLE public.sites 
ALTER COLUMN country SET NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.sites.contact_id IS 'Associated contact for this site';
COMMENT ON COLUMN public.sites.company_id IS 'Associated company for this site';
COMMENT ON COLUMN public.sites.is_deal IS 'Flag indicating if this site is marked as a deal';
COMMENT ON COLUMN public.sites.images IS 'Array of image URLs for site pictures';

-- Create storage bucket for site images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('site-images', 'site-images', true);

-- Create RLS policies for site images
CREATE POLICY "Tenant users can upload site images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'site-images' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text 
    FROM user_tenant_memberships 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Tenant users can view site images" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'site-images' AND 
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text 
    FROM user_tenant_memberships 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Tenant users can update site images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'site-images' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text 
    FROM user_tenant_memberships 
    WHERE user_id = auth.uid() AND active = true
  )
);

CREATE POLICY "Tenant users can delete site images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'site-images' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text 
    FROM user_tenant_memberships 
    WHERE user_id = auth.uid() AND active = true
  )
);