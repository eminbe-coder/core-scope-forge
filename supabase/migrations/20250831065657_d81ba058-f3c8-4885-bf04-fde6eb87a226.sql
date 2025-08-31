-- First, let's create RLS policies for profiles table to allow tenant admins to see users in their tenant
DROP POLICY IF EXISTS "Tenant admins can view user profiles" ON public.profiles;

CREATE POLICY "Tenant admins can view user profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm_admin
    WHERE utm_admin.user_id = auth.uid() 
    AND utm_admin.role IN ('admin', 'super_admin')
    AND utm_admin.active = true
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm_user
      WHERE utm_user.user_id = profiles.id
      AND utm_user.tenant_id = utm_admin.tenant_id
      AND utm_user.active = true
    )
  )
);

-- Update the user_tenant_memberships policy to allow tenant admins to see all users in their tenant
DROP POLICY IF EXISTS "Tenant access for user tenant memberships" ON public.user_tenant_memberships;

CREATE POLICY "Tenant access for user tenant memberships" 
ON public.user_tenant_memberships 
FOR ALL 
USING (
  -- Super admins can see all
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm_super
    WHERE utm_super.user_id = auth.uid() 
    AND utm_super.role = 'super_admin'
    AND utm_super.active = true
  ) OR
  -- Tenant admins can see users in their tenant
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm_admin
    WHERE utm_admin.user_id = auth.uid() 
    AND utm_admin.role = 'admin'
    AND utm_admin.tenant_id = user_tenant_memberships.tenant_id
    AND utm_admin.active = true
  ) OR
  -- Users can see their own memberships
  user_id = auth.uid()
)
WITH CHECK (
  -- Super admins can modify all
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm_super
    WHERE utm_super.user_id = auth.uid() 
    AND utm_super.role = 'super_admin'
    AND utm_super.active = true
  ) OR
  -- Tenant admins can modify users in their tenant
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships utm_admin
    WHERE utm_admin.user_id = auth.uid() 
    AND utm_admin.role = 'admin'
    AND utm_admin.tenant_id = user_tenant_memberships.tenant_id
    AND utm_admin.active = true
  )
);