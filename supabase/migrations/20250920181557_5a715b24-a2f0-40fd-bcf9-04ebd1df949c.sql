-- Add image_url column to device_templates table
ALTER TABLE public.device_templates ADD COLUMN image_url TEXT;

-- Create storage bucket for device template images
INSERT INTO storage.buckets (id, name, public) VALUES ('device-templates', 'device-templates', true);

-- Create storage policies for device template images
CREATE POLICY "Device template images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'device-templates');

CREATE POLICY "Authenticated users can upload device template images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'device-templates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update device template images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'device-templates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete device template images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'device-templates' AND auth.uid() IS NOT NULL);