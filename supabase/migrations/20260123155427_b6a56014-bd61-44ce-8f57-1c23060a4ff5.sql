-- Fix Missing Columns in user_tenant_memberships
-- Support "Portable Profile" architecture - store tenant-specific employment details

ALTER TABLE public.user_tenant_memberships
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS employee_id text,
ADD COLUMN IF NOT EXISTS hire_date date,
ADD COLUMN IF NOT EXISTS notes text;

-- Add comments for documentation
COMMENT ON COLUMN public.user_tenant_memberships.job_title IS 'Employment: Job title within this specific tenant';
COMMENT ON COLUMN public.user_tenant_memberships.employee_id IS 'Employment: Employee ID within this specific tenant';
COMMENT ON COLUMN public.user_tenant_memberships.hire_date IS 'Employment: Hire date for this specific tenant';
COMMENT ON COLUMN public.user_tenant_memberships.notes IS 'Employment: Notes about this membership';

-- Create index for quick employee lookups within a tenant
CREATE INDEX IF NOT EXISTS idx_user_tenant_memberships_employee_lookup 
ON public.user_tenant_memberships(tenant_id, employee_id) WHERE employee_id IS NOT NULL;