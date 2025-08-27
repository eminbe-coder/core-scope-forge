-- Create company_industries table for tenant-specific industry management
CREATE TABLE public.company_industries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create company_types table for tenant-specific company type management  
CREATE TABLE public.company_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Enable RLS on both tables
ALTER TABLE public.company_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company_industries
CREATE POLICY "Tenant access for company industries" 
ON public.company_industries 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create RLS policies for company_types
CREATE POLICY "Tenant access for company types" 
ON public.company_types 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create triggers for updated_at columns
CREATE TRIGGER update_company_industries_updated_at
BEFORE UPDATE ON public.company_industries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_types_updated_at
BEFORE UPDATE ON public.company_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default industries and types for existing tenants
INSERT INTO public.company_industries (tenant_id, name, description) 
SELECT DISTINCT t.id, 'Technology', 'Technology and software companies'
FROM tenants t WHERE t.active = true;

INSERT INTO public.company_industries (tenant_id, name, description) 
SELECT DISTINCT t.id, 'Healthcare', 'Healthcare and medical services'
FROM tenants t WHERE t.active = true;

INSERT INTO public.company_industries (tenant_id, name, description) 
SELECT DISTINCT t.id, 'Finance', 'Financial services and banking'
FROM tenants t WHERE t.active = true;

INSERT INTO public.company_types (tenant_id, name, description) 
SELECT DISTINCT t.id, 'Corporation', 'Large corporation or enterprise'
FROM tenants t WHERE t.active = true;

INSERT INTO public.company_types (tenant_id, name, description) 
SELECT DISTINCT t.id, 'Small Business', 'Small to medium business'
FROM tenants t WHERE t.active = true;

INSERT INTO public.company_types (tenant_id, name, description) 
SELECT DISTINCT t.id, 'Startup', 'Early stage startup company'
FROM tenants t WHERE t.active = true;