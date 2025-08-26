-- Add company_id to activities table for linking to companies
ALTER TABLE public.activities ADD COLUMN company_id UUID;

-- Create activity_logs table for lead activity tracking
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'contact', 'company', 'site', 'customer', 'deal'
  activity_type TEXT NOT NULL, -- 'note', 'call', 'meeting', 'email', 'follow_up'
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for activity_logs
CREATE POLICY "Tenant access for activity logs" 
ON public.activity_logs 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add indexes for better performance
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_id, entity_type);
CREATE INDEX idx_activity_logs_tenant ON public.activity_logs(tenant_id);
CREATE INDEX idx_activities_company ON public.activities(company_id);

-- Create trigger for activity_logs updated_at
CREATE TRIGGER update_activity_logs_updated_at
  BEFORE UPDATE ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();