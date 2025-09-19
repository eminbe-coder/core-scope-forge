-- Ensure admin users have full access to all tables
-- This will help with the assignee filter and other permission issues

-- First check if we need to enable RLS on missing tables
ALTER TABLE IF EXISTS user_tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Create a more permissive policy for tenant admins
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(_tenant_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_tenant_memberships
    WHERE user_id = auth.uid()
    AND (_tenant_id IS NULL OR tenant_id = _tenant_id)
    AND role IN ('admin', 'super_admin')
    AND active = true
  );
$$;

-- Update policies for key tables to allow admins full access
DROP POLICY IF EXISTS "Tenant access for profiles" ON profiles;
CREATE POLICY "Tenant access for profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  -- Allow access if user is admin of any tenant that has this user as member
  EXISTS (
    SELECT 1 FROM user_tenant_memberships utm1
    JOIN user_tenant_memberships utm2 ON utm1.tenant_id = utm2.tenant_id
    WHERE utm1.user_id = auth.uid()
    AND utm1.role IN ('admin', 'super_admin')
    AND utm1.active = true
    AND utm2.user_id = profiles.id
    AND utm2.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_tenant_memberships utm1
    JOIN user_tenant_memberships utm2 ON utm1.tenant_id = utm2.tenant_id
    WHERE utm1.user_id = auth.uid()
    AND utm1.role IN ('admin', 'super_admin')
    AND utm1.active = true
    AND utm2.user_id = profiles.id
    AND utm2.active = true
  )
);