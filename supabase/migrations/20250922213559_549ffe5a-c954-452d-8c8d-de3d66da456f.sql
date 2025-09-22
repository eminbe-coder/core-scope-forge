-- Drop ALL existing RLS policies for device_templates to start fresh
DROP POLICY IF EXISTS "Global templates are publicly readable" ON device_templates;
DROP POLICY IF EXISTS "Super admins manage global templates" ON device_templates;  
DROP POLICY IF EXISTS "Tenant templates access" ON device_templates;
DROP POLICY IF EXISTS "Global device templates are viewable by everyone" ON device_templates;
DROP POLICY IF EXISTS "Super admins can manage global templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant users can view global and their own templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant users can manage their own templates" ON device_templates;
DROP POLICY IF EXISTS "Imported global templates can be viewed by tenants" ON device_templates;
DROP POLICY IF EXISTS "view_global_templates" ON device_templates;
DROP POLICY IF EXISTS "manage_global_templates_super_admin" ON device_templates;
DROP POLICY IF EXISTS "manage_tenant_templates" ON device_templates;

-- Create simple, non-recursive policies
-- Policy 1: Global templates are viewable by everyone
CREATE POLICY "global_templates_readable"
ON device_templates 
FOR SELECT 
USING (is_global = true);

-- Policy 2: Super admins can do everything with global templates
CREATE POLICY "super_admin_global_templates"
ON device_templates 
FOR ALL 
USING (is_global = true AND is_super_admin(auth.uid()))
WITH CHECK (is_global = true AND is_super_admin(auth.uid()));

-- Policy 3: Tenant users can manage their own tenant templates
CREATE POLICY "tenant_templates_access"
ON device_templates 
FOR ALL 
USING (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id));