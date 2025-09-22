-- Fix RLS policies for proper tenant isolation - comprehensive cleanup
-- Temporarily disable RLS to avoid deadlocks
ALTER TABLE device_templates DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies completely
DROP POLICY IF EXISTS "global_templates_viewable" ON device_templates;
DROP POLICY IF EXISTS "super_admin_full_access" ON device_templates;  
DROP POLICY IF EXISTS "tenant_templates_full_access" ON device_templates;
DROP POLICY IF EXISTS "tenant_own_templates" ON device_templates;
DROP POLICY IF EXISTS "global_templates_for_import" ON device_templates;
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

-- Create new clean policies
-- 1. Super admins can access ALL templates (for global admin interface)
CREATE POLICY "super_admin_all_access" 
ON device_templates 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 2. Tenant users can only access their own templates and imported templates (NOT global ones directly)
CREATE POLICY "tenant_owned_templates" 
ON device_templates 
FOR ALL 
USING (
  is_global = false 
  AND tenant_id IS NOT NULL 
  AND user_has_tenant_access(auth.uid(), tenant_id)
)
WITH CHECK (
  is_global = false 
  AND tenant_id IS NOT NULL 
  AND user_has_tenant_access(auth.uid(), tenant_id)
);

-- 3. Global templates are ONLY visible for import purposes (read-only access)
CREATE POLICY "global_templates_import_only" 
ON device_templates 
FOR SELECT
USING (
  is_global = true 
  AND active = true
  AND auth.uid() IS NOT NULL
);