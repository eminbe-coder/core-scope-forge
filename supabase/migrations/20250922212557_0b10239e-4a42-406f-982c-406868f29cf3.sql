-- Check and fix RLS policies for device_templates
-- Drop all existing policies first (using IF EXISTS to avoid errors)
DROP POLICY IF EXISTS "Global templates are publicly readable" ON device_templates;
DROP POLICY IF EXISTS "Super admins manage global templates" ON device_templates;  
DROP POLICY IF EXISTS "Tenant templates access" ON device_templates;
DROP POLICY IF EXISTS "Global device templates are viewable by everyone" ON device_templates;
DROP POLICY IF EXISTS "Super admins can manage global templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant users can view global and their own templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant users can manage their own templates" ON device_templates;
DROP POLICY IF EXISTS "Imported global templates can be viewed by tenants" ON device_templates;

-- Create simple, clean policies without recursion
CREATE POLICY "view_global_templates"
ON device_templates 
FOR SELECT 
USING (is_global = true);

CREATE POLICY "manage_global_templates_super_admin"
ON device_templates 
FOR ALL 
USING (is_global = true AND is_super_admin(auth.uid()))
WITH CHECK (is_global = true AND is_super_admin(auth.uid()));

CREATE POLICY "manage_tenant_templates"
ON device_templates 
FOR ALL 
USING (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id));

-- Update existing templates to have proper import_status
UPDATE device_templates 
SET import_status = 'original' 
WHERE import_status IS NULL;