-- Fix infinite recursion in device_templates RLS policies
-- First, drop all existing policies for device_templates
DROP POLICY IF EXISTS "Global device templates are viewable by everyone" ON device_templates;
DROP POLICY IF EXISTS "Super admins can manage global templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant users can view global and their own templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant users can manage their own templates" ON device_templates;
DROP POLICY IF EXISTS "Imported global templates can be viewed by tenants" ON device_templates;

-- Create new, safe RLS policies without recursion
CREATE POLICY "Global templates viewable by everyone"
ON device_templates 
FOR SELECT 
USING (is_global = true);

CREATE POLICY "Super admins can manage global templates"
ON device_templates 
FOR ALL 
USING (is_global = true AND is_super_admin(auth.uid()))
WITH CHECK (is_global = true AND is_super_admin(auth.uid()));

CREATE POLICY "Tenant templates full access"
ON device_templates 
FOR ALL 
USING (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id));

-- Add better error handling and status columns for templates
ALTER TABLE device_templates 
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS sync_error text;

-- Create clear success message
COMMENT ON TABLE device_templates IS 'Fixed RLS policies to prevent infinite recursion and added sync status tracking';