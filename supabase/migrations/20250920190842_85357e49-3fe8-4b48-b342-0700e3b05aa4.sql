-- Add image_url column to devices table for individual device images
ALTER TABLE public.devices ADD COLUMN image_url TEXT;

-- Create storage bucket for device images (separate from template images)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('device-images', 'device-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for device images bucket
CREATE POLICY "Users can view device images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'device-images');

CREATE POLICY "Users can upload device images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update device images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete device images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);