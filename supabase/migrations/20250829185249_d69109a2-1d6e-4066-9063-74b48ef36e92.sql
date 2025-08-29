-- Create reports table for storing custom reports
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data_source TEXT NOT NULL CHECK (data_source IN ('contacts', 'companies', 'deals', 'sites', 'customers')),
  query_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'tenant')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant access for reports" 
ON public.reports 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create saved_reports table for user's saved report instances
CREATE TABLE public.saved_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for saved_reports
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for saved_reports
CREATE POLICY "Users can manage their own saved reports" 
ON public.saved_reports 
FOR ALL 
USING (
  user_has_tenant_access(auth.uid(), tenant_id) AND 
  (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.reports r 
    WHERE r.id = saved_reports.report_id 
    AND r.visibility = 'tenant'
  ))
)
WITH CHECK (
  user_has_tenant_access(auth.uid(), tenant_id) AND 
  user_id = auth.uid()
);

-- Create trigger for saved_reports updated_at
CREATE TRIGGER update_saved_reports_updated_at
BEFORE UPDATE ON public.saved_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();