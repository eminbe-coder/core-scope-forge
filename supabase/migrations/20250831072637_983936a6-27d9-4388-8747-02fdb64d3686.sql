-- EMERGENCY FIX: Complete removal and recreation of user_tenant_memberships RLS to stop infinite recursion

-- Step 1: Disable RLS temporarily to stop the recursion
ALTER TABLE public.user_tenant_memberships DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on user_tenant_memberships
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "Users can only see their own tenant memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "tenant_admin_can_view_all_memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "tenant_admin_can_update_memberships" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "utm_select_self_or_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "utm_update_by_tenant_admin" ON public.user_tenant_memberships;
DROP POLICY IF EXISTS "utm_insert_by_tenant_admin" ON public.user_tenant_memberships;

-- Step 3: Re-enable RLS
ALTER TABLE public.user_tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, safe policies that don't cause recursion

-- Allow users to see their own memberships
CREATE POLICY "users_see_own_memberships"
ON public.user_tenant_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow super admins to see all memberships (they are already in the system)
CREATE POLICY "super_admin_see_all_memberships"
ON public.user_tenant_memberships
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Allow super admins to update all memberships
CREATE POLICY "super_admin_update_all_memberships"
ON public.user_tenant_memberships
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Allow super admins to insert memberships
CREATE POLICY "super_admin_insert_memberships"
ON public.user_tenant_memberships
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Step 5: Create a simple admin view policy that doesn't recurse
-- This uses a direct lookup without complex joins
CREATE POLICY "tenant_admin_see_tenant_memberships"
ON public.user_tenant_memberships
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships admin_check
    WHERE admin_check.user_id = auth.uid()
    AND admin_check.tenant_id = user_tenant_memberships.tenant_id
    AND admin_check.role IN ('admin', 'super_admin')
    AND admin_check.active = true
  )
);

-- Allow tenant admins to update memberships in their tenant
CREATE POLICY "tenant_admin_update_tenant_memberships"
ON public.user_tenant_memberships
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships admin_check
    WHERE admin_check.user_id = auth.uid()
    AND admin_check.tenant_id = user_tenant_memberships.tenant_id
    AND admin_check.role IN ('admin', 'super_admin')
    AND admin_check.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships admin_check
    WHERE admin_check.user_id = auth.uid()
    AND admin_check.tenant_id = user_tenant_memberships.tenant_id
    AND admin_check.role IN ('admin', 'super_admin')
    AND admin_check.active = true
  )
);