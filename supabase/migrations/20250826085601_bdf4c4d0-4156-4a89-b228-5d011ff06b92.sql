-- Create super admin membership for moaath@bukaai.com
INSERT INTO user_tenant_memberships (user_id, tenant_id, role, active)
VALUES ('f8dcd1fb-a252-4a77-b97d-fb20e1e2b87b', 'fda500ad-f97d-47bd-931f-0e83325d5137', 'super_admin', true)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET 
  role = 'super_admin',
  active = true,
  updated_at = now();