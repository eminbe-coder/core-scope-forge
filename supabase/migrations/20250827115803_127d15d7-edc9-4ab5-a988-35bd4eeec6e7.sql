-- Create table for deal files
CREATE TABLE public.deal_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant access for deal files"
ON public.deal_files
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM deals
    WHERE deals.id = deal_files.deal_id
    AND user_has_tenant_access(auth.uid(), deals.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM deals
    WHERE deals.id = deal_files.deal_id
    AND user_has_tenant_access(auth.uid(), deals.tenant_id)
  )
);

-- Create storage bucket for deal files
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-files', 'deal-files', false);

-- Create storage policies
CREATE POLICY "Authenticated users can view deal files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'deal-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload deal files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'deal-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update deal files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'deal-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete deal files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'deal-files' AND auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_deal_files_updated_at
BEFORE UPDATE ON public.deal_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();