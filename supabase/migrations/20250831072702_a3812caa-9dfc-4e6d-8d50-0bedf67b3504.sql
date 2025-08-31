-- Final fix: Remove all recursive policies and use a completely different approach

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "tenant_admin_see_tenant_memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "tenant_admin_update_tenant_memberships" ON public.user_tenant_memberships;

-- Create a materialized approach instead of recursive checks
-- Use the existing database functions that are already secure

-- For tenant admins, add policies using the existing secure functions
CREATE POLICY "admin_can_view_tenant_memberships"
ON public.user_tenant_memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.is_super_admin(auth.uid())
  OR public.is_tenant_admin_for(tenant_id)
);

CREATE POLICY "admin_can_update_tenant_memberships"
ON public.user_tenant_memberships
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.is_tenant_admin_for(tenant_id)
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.is_tenant_admin_for(tenant_id)
);

CREATE POLICY "admin_can_insert_tenant_memberships"
ON public.user_tenant_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR public.is_tenant_admin_for(tenant_id)
);