-- Phase 1: Make tenant_id nullable in devices table
ALTER TABLE public.devices ALTER COLUMN tenant_id DROP NOT NULL;

-- Phase 2: Update RLS policies for devices table

-- Drop existing policy
DROP POLICY IF EXISTS "Tenant access for devices" ON public.devices;

-- Create new policies to handle both tenant devices and global devices
CREATE POLICY "Tenant devices access" 
ON public.devices 
FOR ALL 
USING (
  tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id)
)
WITH CHECK (
  tenant_id IS NOT NULL AND user_has_tenant_access(auth.uid(), tenant_id)
);

-- Allow all authenticated users to view global devices (tenant_id IS NULL)
CREATE POLICY "Global devices are viewable by everyone" 
ON public.devices 
FOR SELECT 
USING (tenant_id IS NULL);

-- Only super admins can manage global devices
CREATE POLICY "Super admins can manage global devices" 
ON public.devices 
FOR ALL 
USING (
  tenant_id IS NULL AND is_super_admin(auth.uid())
)
WITH CHECK (
  tenant_id IS NULL AND is_super_admin(auth.uid())
);