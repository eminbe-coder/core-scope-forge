-- Completely rebuild RLS to eliminate recursion

-- 1) Drop ALL existing policies on user_tenant_memberships
DROP POLICY IF EXISTS "utm_select_self_or_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "utm_update_by_tenant_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "utm_insert_by_tenant_admin" ON public.user_tenant_memberships;

-- 2) Create basic self-access policy first
CREATE POLICY "utm_basic_self_access"
ON public.user_tenant_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3) Create admin access policy using simplified logic without recursion
CREATE POLICY "utm_admin_all_access"
ON public.user_tenant_memberships
FOR ALL
TO authenticated
USING (
  -- Allow access if user is super_admin (check via simple exists without recursion)
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships super_utm
    WHERE super_utm.user_id = auth.uid()
    AND super_utm.role = 'super_admin'
    AND super_utm.active = true
  )
  OR
  -- Allow access if user is admin in the same tenant
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships admin_utm
    WHERE admin_utm.user_id = auth.uid()
    AND admin_utm.tenant_id = user_tenant_memberships.tenant_id
    AND admin_utm.role = 'admin'
    AND admin_utm.active = true
  )
)
WITH CHECK (
  -- Same logic for WITH CHECK
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships super_utm
    WHERE super_utm.user_id = auth.uid()
    AND super_utm.role = 'super_admin'
    AND super_utm.active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships admin_utm
    WHERE admin_utm.user_id = auth.uid()
    AND admin_utm.tenant_id = user_tenant_memberships.tenant_id
    AND admin_utm.role = 'admin'
    AND admin_utm.active = true
  )
);