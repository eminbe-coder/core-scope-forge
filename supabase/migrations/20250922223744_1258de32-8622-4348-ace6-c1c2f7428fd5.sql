-- Fix RLS policies for proper tenant isolation
-- Temporarily disable RLS to avoid deadlocks
ALTER TABLE device_templates DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "global_templates_viewable" ON device_templates;
DROP POLICY IF EXISTS "super_admin_full_access" ON device_templates;  
DROP POLICY IF EXISTS "tenant_templates_full_access" ON device_templates;

-- Re-enable RLS
ALTER TABLE device_templates ENABLE ROW LEVEL SECURITY;

-- 1. Super admins can access ALL templates (for global admin interface)
CREATE POLICY "super_admin_full_access" 
ON device_templates 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 2. Tenant users can only access their own templates and imported templates (NOT global ones directly)
CREATE POLICY "tenant_own_templates" 
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

-- 3. Global templates are ONLY visible in template import dialog for tenants (through specific queries)
-- This policy allows tenants to SELECT global templates for import purposes only
CREATE POLICY "global_templates_for_import" 
ON device_templates 
FOR SELECT
USING (
  is_global = true 
  AND active = true
  AND auth.uid() IS NOT NULL
);