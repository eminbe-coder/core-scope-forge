-- Replace recursive RLS on user_tenant_memberships with function-based policies

-- 1) Clean up previous policies that may cause recursion
DROP POLICY IF EXISTS "tenant_admin_can_view_all_memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "tenant_admin_can_update_memberships" ON public.user_tenant_memberships;

-- 2) Safe, function-based SELECT policy (no recursive subqueries)
CREATE POLICY "utm_select_self_or_admin"
ON public.user_tenant_memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role_in_tenant(auth.uid(), tenant_id, 'admin')
  OR public.has_role_in_tenant(auth.uid(), tenant_id, 'super_admin')
);

-- 3) Safe, function-based UPDATE policy for tenant admins
CREATE POLICY "utm_update_by_tenant_admin"
ON public.user_tenant_memberships
FOR UPDATE
TO authenticated
USING (
  public.has_role_in_tenant(auth.uid(), tenant_id, 'admin')
  OR public.has_role_in_tenant(auth.uid(), tenant_id, 'super_admin')
)
WITH CHECK (
  public.has_role_in_tenant(auth.uid(), tenant_id, 'admin')
  OR public.has_role_in_tenant(auth.uid(), tenant_id, 'super_admin')
);

-- 4) Optional: allow admins to insert memberships within their tenant (used if UI inserts directly)
CREATE POLICY IF NOT EXISTS "utm_insert_by_tenant_admin"
ON public.user_tenant_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role_in_tenant(auth.uid(), tenant_id, 'admin')
  OR public.has_role_in_tenant(auth.uid(), tenant_id, 'super_admin')
);

-- 5) Strengthen profiles UPDATE policy to allow tenant admins using function, avoiding cross-table recursion
DROP POLICY IF EXISTS "tenant_admin_can_update_profiles" ON public.profiles;
CREATE POLICY "tenant_admin_can_update_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR EXISTS (
    SELECT 1
    FROM public.user_tenant_memberships utm_user
    WHERE utm_user.user_id = profiles.id
      AND utm_user.active = true
      AND (
        public.has_role_in_tenant(auth.uid(), utm_user.tenant_id, 'admin') OR
        public.has_role_in_tenant(auth.uid(), utm_user.tenant_id, 'super_admin')
      )
  )
)
WITH CHECK (
  auth.uid() = id OR EXISTS (
    SELECT 1
    FROM public.user_tenant_memberships utm_user
    WHERE utm_user.user_id = profiles.id
      AND utm_user.active = true
      AND (
        public.has_role_in_tenant(auth.uid(), utm_user.tenant_id, 'admin') OR
        public.has_role_in_tenant(auth.uid(), utm_user.tenant_id, 'super_admin')
      )
  )
);
