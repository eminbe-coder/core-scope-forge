-- Add visualization_type column to reports table
ALTER TABLE public.reports 
ADD COLUMN visualization_type TEXT NOT NULL DEFAULT 'table' 
CHECK (visualization_type IN ('table', 'bar_chart', 'pie_chart', 'kpi_cards'));

-- Create scheduled_reports table
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for scheduled_reports
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scheduled_reports
CREATE POLICY "Tenant access for scheduled reports" 
ON public.scheduled_reports 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create trigger for scheduled_reports updated_at
CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON public.scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create report_exports table for tracking exports
CREATE TABLE public.report_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  export_type TEXT NOT NULL CHECK (export_type IN ('csv', 'pdf')),
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for report_exports
ALTER TABLE public.report_exports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for report_exports
CREATE POLICY "Tenant access for report exports" 
ON public.report_exports 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));