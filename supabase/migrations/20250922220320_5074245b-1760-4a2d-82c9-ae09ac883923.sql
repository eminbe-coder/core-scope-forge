-- Fix infinite recursion in device_templates RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Global device templates are viewable by everyone" ON device_templates;
DROP POLICY IF EXISTS "Tenant device templates access" ON device_templates;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.is_global_template_viewer()
RETURNS boolean AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_manage_global_templates()
RETURNS boolean AS $$
  SELECT is_super_admin(auth.uid());
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create new RLS policies without recursion
CREATE POLICY "Global device templates are viewable by authenticated users" 
ON device_templates 
FOR SELECT 
USING (is_global = true AND is_global_template_viewer());

CREATE POLICY "Super admins can manage global device templates" 
ON device_templates 
FOR ALL 
USING ((is_global = true AND can_manage_global_templates()) OR (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id)))
WITH CHECK ((is_global = true AND can_manage_global_templates()) OR (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id)));

-- Create policy for tenant templates
CREATE POLICY "Tenant device templates access" 
ON device_templates 
FOR ALL 
USING (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id));