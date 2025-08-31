-- Fix infinite recursion by creating security definer functions

-- Drop the problematic policy first
DROP POLICY IF EXISTS "Tenant access for user tenant memberships" ON public.user_tenant_memberships;

-- Create security definer functions to check roles without recursion
CREATE OR REPLACE FUNCTION public.is_tenant_admin_for(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_tenant_memberships
    WHERE user_id = auth.uid() 
    AND tenant_id = _tenant_id
    AND role = 'admin'
    AND active = true
  );
$$;

-- Create new policies that use the security definer functions
CREATE POLICY "Tenant access for user tenant memberships" 
ON public.user_tenant_memberships 
FOR ALL 
USING (
  -- Super admins can see all
  is_super_admin(auth.uid()) OR
  -- Tenant admins can see users in their tenant
  is_tenant_admin_for(tenant_id) OR
  -- Users can see their own memberships
  user_id = auth.uid()
)
WITH CHECK (
  -- Super admins can modify all
  is_super_admin(auth.uid()) OR
  -- Tenant admins can modify users in their tenant
  is_tenant_admin_for(tenant_id)
);