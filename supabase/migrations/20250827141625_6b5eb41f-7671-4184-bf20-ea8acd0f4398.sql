-- Create lead_files table for file management
CREATE TABLE public.lead_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'site')),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  tenant_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.lead_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant access for lead files" 
ON public.lead_files 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create updated_at trigger
CREATE TRIGGER update_lead_files_updated_at
BEFORE UPDATE ON public.lead_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for lead files if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lead-files', 'lead-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for lead files
CREATE POLICY "Users can view their tenant lead files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'lead-files' AND 
  EXISTS (
    SELECT 1 FROM public.lead_files 
    WHERE file_path = name AND user_has_tenant_access(auth.uid(), tenant_id)
  )
);

CREATE POLICY "Users can upload lead files for their tenant" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'lead-files' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their tenant lead files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'lead-files' AND 
  EXISTS (
    SELECT 1 FROM public.lead_files 
    WHERE file_path = name AND user_has_tenant_access(auth.uid(), tenant_id)
  )
);

CREATE POLICY "Users can delete their tenant lead files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'lead-files' AND 
  EXISTS (
    SELECT 1 FROM public.lead_files 
    WHERE file_path = name AND user_has_tenant_access(auth.uid(), tenant_id)
  )
);