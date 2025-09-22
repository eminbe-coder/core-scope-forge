-- Fix RLS policies for device_templates to prevent infinite recursion
-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Global templates viewable by everyone" ON device_templates;
DROP POLICY IF EXISTS "Super admins can manage global templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant templates full access" ON device_templates;

-- Create simple, non-recursive policies
CREATE POLICY "Global templates are publicly readable"
ON device_templates 
FOR SELECT 
USING (is_global = true);

CREATE POLICY "Super admins manage global templates"
ON device_templates 
FOR ALL 
USING (is_global = true AND is_super_admin(auth.uid()))
WITH CHECK (is_global = true AND is_super_admin(auth.uid()));

CREATE POLICY "Tenant templates access"
ON device_templates 
FOR ALL 
USING (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id));

-- Update existing templates to have proper import_status
UPDATE device_templates 
SET import_status = 'original' 
WHERE import_status IS NULL AND is_global = true;

UPDATE device_templates 
SET import_status = 'original' 
WHERE import_status IS NULL AND is_global = false;