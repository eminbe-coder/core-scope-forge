-- Drop ALL existing policies on device_templates to eliminate recursion
DROP POLICY IF EXISTS "Super admin manage global templates" ON device_templates;
DROP POLICY IF EXISTS "Super admins can manage all device templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant template access" ON device_templates;
DROP POLICY IF EXISTS "Tenant users can view imported global templates and their own t" ON device_templates;
DROP POLICY IF EXISTS "View global templates" ON device_templates;
DROP POLICY IF EXISTS "global_templates_readable" ON device_templates;
DROP POLICY IF EXISTS "super_admin_global_templates" ON device_templates;
DROP POLICY IF EXISTS "tenant_templates_access" ON device_templates;

-- Create simple, non-recursive policies
CREATE POLICY "allow_select_global_templates" 
ON device_templates 
FOR SELECT 
USING (is_global = true);

CREATE POLICY "allow_super_admin_all_access" 
ON device_templates 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "allow_tenant_template_access" 
ON device_templates 
FOR ALL 
USING (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id));