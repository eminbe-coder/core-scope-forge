-- First, let's check if moaath@essensia.bh exists and update their role
-- Update the user to super_admin role (this will work if the user exists)
UPDATE user_tenant_memberships 
SET role = 'super_admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'moaath@essensia.bh'
);

-- Create a function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenant_memberships
    WHERE user_id = _user_id
      AND role = 'super_admin'
      AND active = true
  );
$$;

-- Update tenant access policies to allow super admins
DROP POLICY IF EXISTS "Users can view tenants they belong to" ON tenants;

CREATE POLICY "Users can view tenants they belong to or super admins can view all"
ON tenants
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1
    FROM user_tenant_memberships
    WHERE user_tenant_memberships.user_id = auth.uid()
      AND user_tenant_memberships.tenant_id = tenants.id
      AND user_tenant_memberships.active = true
  )
);

-- Allow super admins to manage tenants
CREATE POLICY "Super admins can manage tenants"
ON tenants
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Allow super admins to manage user tenant memberships
DROP POLICY IF EXISTS "Users can view their own memberships" ON user_tenant_memberships;

CREATE POLICY "Users can view their own memberships"
ON user_tenant_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all memberships"
ON user_tenant_memberships
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage memberships"
ON user_tenant_memberships
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create a function to get all tenants for super admin
CREATE OR REPLACE FUNCTION public.get_all_tenants_for_super_admin()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  domain text,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  default_currency_id uuid,
  settings jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT t.id, t.name, t.slug, t.domain, t.active, t.created_at, t.updated_at, t.default_currency_id, t.settings
  FROM tenants t
  WHERE is_super_admin(auth.uid());
$$;