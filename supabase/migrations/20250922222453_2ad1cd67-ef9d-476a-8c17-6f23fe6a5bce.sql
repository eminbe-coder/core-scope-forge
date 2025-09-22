-- Temporarily disable RLS to avoid deadlocks
ALTER TABLE device_templates DISABLE ROW LEVEL SECURITY;

-- Drop all policies while RLS is disabled
DROP POLICY IF EXISTS "Super admin manage global templates" ON device_templates;
DROP POLICY IF EXISTS "Super admins can manage all device templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant template access" ON device_templates;
DROP POLICY IF EXISTS "Tenant users can view imported global templates and their own t" ON device_templates;
DROP POLICY IF EXISTS "View global templates" ON device_templates;
DROP POLICY IF EXISTS "global_templates_readable" ON device_templates;
DROP POLICY IF EXISTS "super_admin_global_templates" ON device_templates;
DROP POLICY IF EXISTS "tenant_templates_access" ON device_templates;

-- Re-enable RLS
ALTER TABLE device_templates ENABLE ROW LEVEL SECURITY;

-- Create simple, clean policies without recursion
CREATE POLICY "global_templates_viewable" 
ON device_templates 
FOR SELECT 
USING (is_global = true);

CREATE POLICY "super_admin_full_access" 
ON device_templates 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "tenant_templates_full_access" 
ON device_templates 
FOR ALL 
USING (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id));