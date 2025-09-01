-- Create relationship roles table for tenant-level role management
CREATE TABLE public.relationship_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general', -- general, contractor, consultant, etc.
  active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.relationship_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenant access for relationship roles" 
ON public.relationship_roles 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_relationship_roles_updated_at
BEFORE UPDATE ON public.relationship_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create entity relationships table to link entities with companies/contacts using roles
CREATE TABLE public.entity_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('deal', 'site', 'lead_company', 'lead_contact')),
  entity_id UUID NOT NULL,
  relationship_role_id UUID NOT NULL REFERENCES public.relationship_roles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (
    (company_id IS NOT NULL AND contact_id IS NULL) OR 
    (company_id IS NULL AND contact_id IS NOT NULL)
  ),
  UNIQUE(entity_type, entity_id, relationship_role_id, company_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenant access for entity relationships" 
ON public.entity_relationships 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_entity_relationships_updated_at
BEFORE UPDATE ON public.entity_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default relationship roles for existing tenants
INSERT INTO public.relationship_roles (name, description, category, tenant_id)
SELECT 
  role_name,
  role_description,
  role_category,
  t.id as tenant_id
FROM 
  (SELECT id FROM public.tenants WHERE active = true) t
CROSS JOIN (
  VALUES 
    ('Main Contractor', 'Primary construction contractor responsible for overall project execution', 'contractor'),
    ('Interior Designer', 'Professional responsible for interior design and space planning', 'design'),
    ('Electrical Contractor', 'Specialist contractor handling electrical installations', 'contractor'),
    ('Consultant', 'Professional advisor providing expert consultation services', 'consultant'),
    ('Client Representative', 'Representative acting on behalf of the client', 'client'),
    ('ELV Contractor', 'Extra Low Voltage systems contractor', 'contractor'),
    ('MEP Consultant', 'Mechanical, Electrical, and Plumbing consultant', 'consultant'),
    ('Swimming Pool Contractor', 'Specialist contractor for swimming pool construction', 'contractor'),
    ('Landscape Contractor', 'Professional handling landscaping and outdoor spaces', 'contractor'),
    ('Hardscape Contractor', 'Contractor specializing in hard landscaping elements', 'contractor'),
    ('HVAC Contractor', 'Heating, Ventilation, and Air Conditioning contractor', 'contractor'),
    ('Curtain Contractor', 'Specialist contractor for curtain and window treatments', 'contractor'),
    ('Lighting Contractor', 'Professional handling lighting design and installation', 'contractor'),
    ('Home Automation Contractor', 'Smart home and automation systems contractor', 'contractor')
) AS default_roles(role_name, role_description, role_category);