-- Create solution_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.solution_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Unique constraint to prevent duplicate names per tenant
DO $$ BEGIN
  ALTER TABLE public.solution_categories
  ADD CONSTRAINT solution_categories_tenant_name_unique UNIQUE (tenant_id, name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable RLS
ALTER TABLE public.solution_categories ENABLE ROW LEVEL SECURITY;

-- Policy for tenant access
DO $$ BEGIN
  CREATE POLICY "Tenant access for solution categories"
  ON public.solution_categories
  FOR ALL
  USING (user_has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to auto-update updated_at
DO $$ BEGIN
  CREATE TRIGGER update_solution_categories_updated_at
  BEFORE UPDATE ON public.solution_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_solution_categories_tenant ON public.solution_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_solution_categories_active ON public.solution_categories(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_solution_categories_name ON public.solution_categories(tenant_id, name);

-- Optional: Add FK from tenants.default_solution_category_id to solution_categories.id
DO $$ BEGIN
  ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_default_solution_category_fk FOREIGN KEY (default_solution_category_id)
  REFERENCES public.solution_categories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;