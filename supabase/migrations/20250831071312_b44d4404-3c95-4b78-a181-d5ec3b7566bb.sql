-- Fix RLS policies for tenant admin user management

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "tenant_admin_can_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "tenant_admin_can_update_memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "tenant_admin_can_deactivate_users" ON public.user_tenant_memberships;

-- Allow tenant admins to update user profiles in their tenant
CREATE POLICY "tenant_admin_can_update_profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm1
    WHERE utm1.user_id = auth.uid()
    AND utm1.role IN ('admin', 'super_admin')
    AND utm1.active = true
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm2
      WHERE utm2.user_id = profiles.id
      AND utm2.tenant_id = utm1.tenant_id
      AND utm2.active = true
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm1
    WHERE utm1.user_id = auth.uid()
    AND utm1.role IN ('admin', 'super_admin')
    AND utm1.active = true
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm2
      WHERE utm2.user_id = profiles.id
      AND utm2.tenant_id = utm1.tenant_id
      AND utm2.active = true
    )
  )
);

-- Allow tenant admins to update user memberships in their tenant
CREATE POLICY "tenant_admin_can_update_memberships" 
ON public.user_tenant_memberships 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm
    WHERE utm.user_id = auth.uid()
    AND utm.tenant_id = user_tenant_memberships.tenant_id
    AND utm.role IN ('admin', 'super_admin')
    AND utm.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm
    WHERE utm.user_id = auth.uid()
    AND utm.tenant_id = user_tenant_memberships.tenant_id
    AND utm.role IN ('admin', 'super_admin')
    AND utm.active = true
  )
);

-- Allow tenant admins to view all memberships in their tenant
CREATE POLICY "tenant_admin_can_view_all_memberships" 
ON public.user_tenant_memberships 
FOR SELECT 
TO authenticated 
USING (
  -- User can see their own memberships
  user_id = auth.uid()
  OR
  -- Or they are admin/super_admin in the same tenant
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm
    WHERE utm.user_id = auth.uid()
    AND utm.tenant_id = user_tenant_memberships.tenant_id
    AND utm.role IN ('admin', 'super_admin')
    AND utm.active = true
  )
);