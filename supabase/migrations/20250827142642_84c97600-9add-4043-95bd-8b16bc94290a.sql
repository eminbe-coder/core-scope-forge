-- Create table for tenant-specific OneDrive integration settings
CREATE TABLE public.tenant_onedrive_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  root_folder_id TEXT,
  folder_structure JSONB DEFAULT '{"customers": "", "sites": "", "deals": ""}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_tenant_onedrive_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_tenant_onedrive UNIQUE (tenant_id)
);

-- Enable RLS
ALTER TABLE public.tenant_onedrive_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant access for OneDrive settings" ON public.tenant_onedrive_settings
  FOR ALL USING (user_has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_tenant_onedrive_settings_updated_at
  BEFORE UPDATE ON public.tenant_onedrive_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();