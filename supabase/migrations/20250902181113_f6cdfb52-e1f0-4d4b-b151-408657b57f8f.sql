-- Create enum types for targets
CREATE TYPE target_level AS ENUM ('company', 'branch', 'department', 'user');
CREATE TYPE target_type AS ENUM ('leads_count', 'deals_count', 'deals_value', 'payments_value');
CREATE TYPE period_type AS ENUM ('monthly', 'quarterly', 'yearly');

-- Create targets table
CREATE TABLE public.targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  target_level target_level NOT NULL,
  entity_id UUID, -- null for company level, branch_id/department_id/user_id for others
  target_type target_type NOT NULL,
  target_value NUMERIC NOT NULL CHECK (target_value >= 0),
  period_type period_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure period_end is after period_start
  CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- Create unique constraint to prevent duplicate targets for same entity/type/period
CREATE UNIQUE INDEX idx_targets_unique ON public.targets (
  tenant_id, 
  target_level, 
  COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), 
  target_type, 
  period_start, 
  period_end
) WHERE active = true;

-- Enable RLS
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Tenant access for targets" 
ON public.targets 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add foreign key constraints with proper handling for different entity types
-- Note: We can't add direct foreign keys since entity_id refers to different tables
-- We'll handle referential integrity at the application level

-- Add trigger for updated_at
CREATE TRIGGER update_targets_updated_at
    BEFORE UPDATE ON public.targets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_targets_tenant_level ON public.targets (tenant_id, target_level);
CREATE INDEX idx_targets_entity ON public.targets (entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_targets_period ON public.targets (period_start, period_end);
CREATE INDEX idx_targets_active ON public.targets (active) WHERE active = true;