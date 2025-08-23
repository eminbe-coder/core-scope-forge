-- Enhanced multi-tenant SaaS database schema (fixed)

-- Add missing project types enum values
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'lighting_control' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_type')) THEN
    ALTER TYPE project_type ADD VALUE 'lighting_control';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'elv' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_type')) THEN
    ALTER TYPE project_type ADD VALUE 'elv';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'home_automation' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'project_type')) THEN
    ALTER TYPE project_type ADD VALUE 'home_automation';
  END IF;
END $$;

-- Update activity_type enum to include more types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'deal_updated' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type')) THEN
    ALTER TYPE activity_type ADD VALUE 'deal_updated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'customer_updated' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type')) THEN
    ALTER TYPE activity_type ADD VALUE 'customer_updated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'project_updated' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type')) THEN
    ALTER TYPE activity_type ADD VALUE 'project_updated';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'task_completed' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'activity_type')) THEN
    ALTER TYPE activity_type ADD VALUE 'task_completed';
  END IF;
END $$;

-- Add unique constraint for contacts email per tenant if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_email_tenant_unique') THEN
    ALTER TABLE public.contacts ADD CONSTRAINT contacts_email_tenant_unique UNIQUE (email, tenant_id);
  END IF;
END $$;

-- Add default_currency_id to tenants for tenant-level currency defaults
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'default_currency_id') THEN
    ALTER TABLE public.tenants ADD COLUMN default_currency_id UUID REFERENCES public.currencies(id);
  END IF;
END $$;

-- Update customers table to support better currency inheritance
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'currency_id') THEN
    ALTER TABLE public.customers ADD COLUMN currency_id UUID REFERENCES public.currencies(id);
  END IF;
END $$;

-- Update deals to inherit currency properly
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'currency_id') THEN
    ALTER TABLE public.deals ADD COLUMN currency_id UUID REFERENCES public.currencies(id);
  END IF;
END $$;

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

-- Create policy for project_floors if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_floors' AND policyname = 'Tenant access for project floors') THEN
    EXECUTE 'CREATE POLICY "Tenant access for project floors" ON public.project_floors
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.projects 
        WHERE projects.id = project_floors.project_id 
        AND user_has_tenant_access(auth.uid(), projects.tenant_id) 
        AND projects.tenant_id = get_current_tenant_id()
      )
    )';
  END IF;
END $$;

-- Add trigger for project_floors updated_at
DROP TRIGGER IF EXISTS update_project_floors_updated_at ON public.project_floors;
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

-- Create policy for devices if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'devices' AND policyname = 'Tenant access for devices') THEN
    EXECUTE 'CREATE POLICY "Tenant access for devices" ON public.devices
    FOR ALL
    USING (user_has_tenant_access(auth.uid(), tenant_id) AND tenant_id = get_current_tenant_id())';
  END IF;
END $$;

-- Add trigger for devices updated_at
DROP TRIGGER IF EXISTS update_devices_updated_at ON public.devices;
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

-- Create policy for project_devices if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_devices' AND policyname = 'Tenant access for project devices') THEN
    EXECUTE 'CREATE POLICY "Tenant access for project devices" ON public.project_devices
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.projects 
        WHERE projects.id = project_devices.project_id 
        AND user_has_tenant_access(auth.uid(), projects.tenant_id) 
        AND projects.tenant_id = get_current_tenant_id()
      )
    )';
  END IF;
END $$;

-- Add trigger for project_devices updated_at
DROP TRIGGER IF EXISTS update_project_devices_updated_at ON public.project_devices;
CREATE TRIGGER update_project_devices_updated_at
  BEFORE UPDATE ON public.project_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update activities table to support polymorphic relationships better
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'site_id') THEN
    ALTER TABLE public.activities ADD COLUMN site_id UUID REFERENCES public.sites(id);
  END IF;
END $$;

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