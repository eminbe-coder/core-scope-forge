-- Temporarily disable RLS on device_templates to clear all policy issues
ALTER TABLE device_templates DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS 
ALTER TABLE device_templates ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible policies without any complex conditions
CREATE POLICY "authenticated_users_can_read_global_templates" 
ON device_templates 
FOR SELECT 
USING (is_global = true AND auth.uid() IS NOT NULL);

CREATE POLICY "super_admins_full_access" 
ON device_templates 
FOR ALL 
USING (auth.uid() IN (
  SELECT user_id FROM user_tenant_memberships 
  WHERE role = 'super_admin' AND active = true
));

CREATE POLICY "tenant_users_access_tenant_templates" 
ON device_templates 
FOR ALL 
USING (
  is_global = false 
  AND tenant_id IN (
    SELECT tenant_id FROM user_tenant_memberships 
    WHERE user_id = auth.uid() AND active = true
  )
);