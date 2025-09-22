-- Fix infinite recursion in device_templates RLS policies by completely rebuilding them

-- First, drop all existing policies on device_templates
DROP POLICY IF EXISTS "Global device templates are viewable by authenticated users" ON device_templates;
DROP POLICY IF EXISTS "Super admins can manage global device templates" ON device_templates;
DROP POLICY IF EXISTS "Tenant device templates access" ON device_templates;
DROP POLICY IF EXISTS "Global device templates are viewable by everyone" ON device_templates;
DROP POLICY IF EXISTS "Tenant device templates access" ON device_templates;

-- Drop existing functions that might cause recursion
DROP FUNCTION IF EXISTS public.is_global_template_viewer();
DROP FUNCTION IF EXISTS public.can_manage_global_templates();

-- Create new simple RLS policies without recursion
CREATE POLICY "View global templates" 
ON device_templates 
FOR SELECT 
USING (is_global = true);

CREATE POLICY "Super admin manage global templates" 
ON device_templates 
FOR ALL 
USING (is_global = true AND is_super_admin(auth.uid()))
WITH CHECK (is_global = true AND is_super_admin(auth.uid()));

CREATE POLICY "Tenant template access" 
ON device_templates 
FOR ALL 
USING (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id));