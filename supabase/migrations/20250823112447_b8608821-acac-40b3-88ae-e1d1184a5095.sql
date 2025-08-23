-- Enhanced multi-tenant SaaS database schema

-- Add missing project types enum values
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'lighting_control';
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'elv';
ALTER TYPE project_type ADD VALUE IF NOT EXISTS 'home_automation';

-- Update activity_type enum to include more types
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'deal_updated';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'customer_updated';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'project_updated';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'task_completed';

-- Add unique constraint for contacts email per tenant
ALTER TABLE public.contacts ADD CONSTRAINT contacts_email_tenant_unique UNIQUE (email, tenant_id);

-- Add default_currency_id to tenants for tenant-level currency defaults
ALTER TABLE public.tenants ADD COLUMN default_currency_id UUID REFERENCES public.currencies(id);

-- Update customers table to support better currency inheritance
ALTER TABLE public.customers ADD COLUMN currency_id UUID REFERENCES public.currencies(id);

-- Update deals to inherit currency properly
ALTER TABLE public.deals DROP COLUMN IF EXISTS currency_id;
ALTER TABLE public.deals ADD COLUMN currency_id UUID REFERENCES public.currencies(id);

-- Update projects to support multiple sites and better currency inheritance
CREATE TABLE IF NOT EXISTS public.project_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, site_id)
);

-- Enable RLS on project_sites
ALTER TABLE public.project_sites ENABLE ROW LEVEL SECURITY;

-- Create policy for project_sites
CREATE POLICY "Tenant access for project sites" ON public.project_sites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_sites.project_id 
    AND user_has_tenant_access(auth.uid(), projects.tenant_id) 
    AND projects.tenant_id = get_current_tenant_id()
  )
);

-- Create project_floors table for detailed project planning
CREATE TABLE IF NOT EXISTS public.project_floors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER,
  area NUMERIC,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_floors
ALTER TABLE public.project_floors ENABLE ROW LEVEL SECURITY;

-- Create policy for project_floors
CREATE POLICY "Tenant access for project floors" ON public.project_floors
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_floors.project_id 
    AND user_has_tenant_access(auth.uid(), projects.tenant_id) 
    AND projects.tenant_id = get_current_tenant_id()
  )
);

-- Add trigger for project_floors updated_at
CREATE TRIGGER update_project_floors_updated_at
  BEFORE UPDATE ON public.project_floors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create devices table for project management
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- lighting, control, elv, automation
  brand TEXT,
  model TEXT,
  specifications JSONB,
  unit_price NUMERIC,
  currency_id UUID REFERENCES public.currencies(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Create policy for devices
CREATE POLICY "Tenant access for devices" ON public.devices
FOR ALL
USING (user_has_tenant_access(auth.uid(), tenant_id) AND tenant_id = get_current_tenant_id());

-- Add trigger for devices updated_at
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create project_devices table for linking devices to projects
CREATE TABLE IF NOT EXISTS public.project_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES public.project_floors(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_devices
ALTER TABLE public.project_devices ENABLE ROW LEVEL SECURITY;

-- Create policy for project_devices
CREATE POLICY "Tenant access for project devices" ON public.project_devices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = project_devices.project_id 
    AND user_has_tenant_access(auth.uid(), projects.tenant_id) 
    AND projects.tenant_id = get_current_tenant_id()
  )
);

-- Add trigger for project_devices updated_at
CREATE TRIGGER update_project_devices_updated_at
  BEFORE UPDATE ON public.project_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update activities table to support polymorphic relationships better
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id);

-- Create function to get currency with inheritance logic
CREATE OR REPLACE FUNCTION public.get_effective_currency(
  entity_type TEXT,
  entity_id UUID,
  tenant_id UUID
)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Try to get currency from the entity itself
    CASE 
      WHEN entity_type = 'customer' THEN (SELECT currency_id FROM customers WHERE id = entity_id)
      WHEN entity_type = 'deal' THEN (
        SELECT COALESCE(
          deals.currency_id,
          customers.currency_id
        )
        FROM deals 
        LEFT JOIN customers ON deals.customer_id = customers.id 
        WHERE deals.id = entity_id
      )
      WHEN entity_type = 'project' THEN (
        SELECT COALESCE(
          customers.currency_id,
          (SELECT default_currency_id FROM tenants WHERE id = tenant_id)
        )
        FROM projects 
        LEFT JOIN deals ON projects.deal_id = deals.id
        LEFT JOIN customers ON deals.customer_id = customers.id 
        WHERE projects.id = entity_id
      )
    END,
    -- Fallback to tenant default currency
    (SELECT default_currency_id FROM tenants WHERE id = tenant_id),
    -- Final fallback to USD
    (SELECT id FROM currencies WHERE code = 'USD' LIMIT 1)
  );
$$;

-- Create function to automatically set currency on deals
CREATE OR REPLACE FUNCTION public.set_deal_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set currency if not explicitly provided
  IF NEW.currency_id IS NULL THEN
    NEW.currency_id := public.get_effective_currency('deal', NEW.id, NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for deal currency
DROP TRIGGER IF EXISTS set_deal_currency_trigger ON public.deals;
CREATE TRIGGER set_deal_currency_trigger
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_deal_currency();

-- Create function to automatically set currency on projects
CREATE OR REPLACE FUNCTION public.set_project_currency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set currency if not explicitly provided
  IF NEW.currency_id IS NULL THEN
    NEW.currency_id := public.get_effective_currency('project', NEW.id, NEW.tenant_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for project currency
DROP TRIGGER IF EXISTS set_project_currency_trigger ON public.projects;
CREATE TRIGGER set_project_currency_trigger
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_currency();

-- Set default currencies for existing tenants (USD as fallback)
UPDATE public.tenants 
SET default_currency_id = (SELECT id FROM public.currencies WHERE code = 'USD' LIMIT 1)
WHERE default_currency_id IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_email_tenant ON public.contacts(email, tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON public.activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_devices_category ON public.devices(category);
CREATE INDEX IF NOT EXISTS idx_project_devices_project_id ON public.project_devices(project_id);
CREATE INDEX IF NOT EXISTS idx_project_sites_project_id ON public.project_sites(project_id);
CREATE INDEX IF NOT EXISTS idx_project_floors_project_id ON public.project_floors(project_id);