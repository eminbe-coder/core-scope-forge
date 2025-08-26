-- Add company details and other fields to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS company_location text,
ADD COLUMN IF NOT EXISTS cr_number text,
ADD COLUMN IF NOT EXISTS tax_number text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text;

-- Add default super admin user membership if not exists
INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, active)
SELECT 
  (SELECT id FROM auth.users WHERE email = 'moaath@bukaai.com' LIMIT 1),
  t.id,
  'super_admin'::app_role,
  true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_tenant_memberships utm 
  WHERE utm.user_id = (SELECT id FROM auth.users WHERE email = 'moaath@bukaai.com' LIMIT 1)
  AND utm.role = 'super_admin'
);

-- Create function to get user memberships with tenant details
CREATE OR REPLACE FUNCTION public.get_user_tenant_memberships(_user_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  tenant_id uuid,
  role app_role,
  active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  tenant json
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    utm.id,
    utm.user_id,
    utm.tenant_id,
    utm.role,
    utm.active,
    utm.created_at,
    utm.updated_at,
    json_build_object(
      'id', t.id,
      'name', t.name,
      'slug', t.slug,
      'domain', t.domain,
      'active', t.active,
      'company_location', t.company_location,
      'cr_number', t.cr_number,
      'tax_number', t.tax_number,
      'contact_email', t.contact_email,
      'contact_phone', t.contact_phone,
      'default_currency_id', t.default_currency_id,
      'settings', t.settings,
      'created_at', t.created_at,
      'updated_at', t.updated_at
    ) as tenant
  FROM public.user_tenant_memberships utm
  JOIN public.tenants t ON utm.tenant_id = t.id
  WHERE utm.user_id = _user_id
  AND utm.active = true
  ORDER BY t.name;
$$;

-- Create function to get all tenant memberships for super admin
CREATE OR REPLACE FUNCTION public.get_all_tenant_memberships_for_super_admin()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  tenant_id uuid,
  role app_role,
  active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  tenant json,
  user_profile json
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    utm.id,
    utm.user_id,
    utm.tenant_id,
    utm.role,
    utm.active,
    utm.created_at,
    utm.updated_at,
    json_build_object(
      'id', t.id,
      'name', t.name,
      'slug', t.slug,
      'domain', t.domain,
      'active', t.active,
      'company_location', t.company_location,
      'cr_number', t.cr_number,
      'tax_number', t.tax_number,
      'contact_email', t.contact_email,
      'contact_phone', t.contact_phone,
      'default_currency_id', t.default_currency_id,
      'settings', t.settings,
      'created_at', t.created_at,
      'updated_at', t.updated_at
    ) as tenant,
    json_build_object(
      'id', p.id,
      'email', p.email,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'avatar_url', p.avatar_url
    ) as user_profile
  FROM public.user_tenant_memberships utm
  JOIN public.tenants t ON utm.tenant_id = t.id
  JOIN public.profiles p ON utm.user_id = p.id
  WHERE is_super_admin(auth.uid())
  ORDER BY t.name, p.first_name, p.last_name;
$$;