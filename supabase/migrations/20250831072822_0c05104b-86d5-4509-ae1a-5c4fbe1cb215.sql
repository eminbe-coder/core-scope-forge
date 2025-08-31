-- Remove recursive and duplicate policies on user_tenant_memberships
DROP POLICY IF EXISTS "utm_admin_all_access" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "utm_basic_self_access" ON public.user_tenant_memberships;

-- Ensure minimal safe set remains: 
-- users_see_own_memberships (SELECT)
-- super_admin_* (SELECT/UPDATE/INSERT)
-- admin_can_* (SELECT/UPDATE/INSERT) using is_tenant_admin_for
-- tenant_admin_* (SELECT/UPDATE/INSERT) using is_tenant_admin_for
