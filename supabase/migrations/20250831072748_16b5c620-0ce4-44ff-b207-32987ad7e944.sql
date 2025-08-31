-- COMPLETE FIX: Remove all recursive policies and create safe ones

-- Drop all policies that cause recursion
DROP POLICY IF EXISTS "Tenant access for user tenant memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "tenant_admin_see_tenant_memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "tenant_admin_update_tenant_memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "utm_insert_by_tenant_admin" ON public.user_tenant_memberships;

-- Create simple, safe policies using only functions that don't recurse

-- 1. Users can see their own memberships
-- (This already exists and is safe)

-- 2. Super admins can see/manage everything 
-- (These already exist and are safe)

-- 3. Tenant admins can insert memberships in their tenant (using function)
CREATE POLICY "tenant_admin_insert_memberships"
ON public.user_tenant_memberships
FOR INSERT
TO authenticated
WITH CHECK (public.is_tenant_admin_for(tenant_id));

-- 4. Tenant admins can update memberships in their tenant (using function)
CREATE POLICY "tenant_admin_update_memberships"
ON public.user_tenant_memberships
FOR UPDATE
TO authenticated
USING (public.is_tenant_admin_for(tenant_id))
WITH CHECK (public.is_tenant_admin_for(tenant_id));

-- 5. Tenant admins can see memberships in their tenant (using function)
CREATE POLICY "tenant_admin_see_memberships"
ON public.user_tenant_memberships
FOR SELECT
TO authenticated
USING (public.is_tenant_admin_for(tenant_id));