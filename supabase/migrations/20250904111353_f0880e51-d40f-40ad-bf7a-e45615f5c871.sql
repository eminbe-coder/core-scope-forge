-- Create lead stages table
CREATE TABLE public.lead_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead quality table  
CREATE TABLE public.lead_quality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_quality ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant access for lead stages" 
ON public.lead_stages 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant access for lead quality" 
ON public.lead_quality 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add stage_id and quality_id to contacts table
ALTER TABLE public.contacts 
ADD COLUMN stage_id UUID,
ADD COLUMN quality_id UUID;

-- Add stage_id and quality_id to companies table  
ALTER TABLE public.companies 
ADD COLUMN stage_id UUID,
ADD COLUMN quality_id UUID;

-- Add stage_id and quality_id to sites table
ALTER TABLE public.sites 
ADD COLUMN stage_id UUID,
ADD COLUMN quality_id UUID;

-- Create triggers for updated_at
CREATE TRIGGER update_lead_stages_updated_at
  BEFORE UPDATE ON public.lead_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_quality_updated_at
  BEFORE UPDATE ON public.lead_quality
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default lead stages
INSERT INTO public.lead_stages (name, sort_order, tenant_id) 
SELECT 'Cold Call', 1, id FROM tenants WHERE active = true;

INSERT INTO public.lead_stages (name, sort_order, tenant_id) 
SELECT 'Presentation', 2, id FROM tenants WHERE active = true;

INSERT INTO public.lead_stages (name, sort_order, tenant_id) 
SELECT 'Defining the Contact', 3, id FROM tenants WHERE active = true;

INSERT INTO public.lead_stages (name, sort_order, tenant_id) 
SELECT 'Waiting for RFQ', 4, id FROM tenants WHERE active = true;

-- Insert default lead quality
INSERT INTO public.lead_quality (name, sort_order, tenant_id) 
SELECT 'High Quality', 1, id FROM tenants WHERE active = true;

INSERT INTO public.lead_quality (name, sort_order, tenant_id) 
SELECT 'No Measured', 2, id FROM tenants WHERE active = true;

INSERT INTO public.lead_quality (name, sort_order, tenant_id) 
SELECT 'Junk', 3, id FROM tenants WHERE active = true;