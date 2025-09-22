-- Fix RLS policies for device_templates to only show imported global templates
-- Remove the problematic policy that shows all global templates to tenants
DROP POLICY IF EXISTS "Tenant users can view global and their own templates" ON device_templates;

-- Add a new policy that only shows imported global templates to tenants
CREATE POLICY "Tenant users can view imported global templates and their own templates" 
ON device_templates FOR SELECT 
USING (
  (
    -- Tenant's own templates (not global)
    (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id))
  ) OR (
    -- Global templates that have been imported by this tenant
    (is_global = true AND tenant_id IS NULL AND EXISTS (
      SELECT 1 FROM device_templates imported_template 
      WHERE imported_template.source_template_id = device_templates.id 
        AND imported_template.tenant_id IN (
          SELECT tenant_id FROM user_tenant_memberships 
          WHERE user_id = auth.uid() AND active = true
        )
        AND imported_template.import_status = 'imported'
    ))
  ) OR (
    -- Imported global templates (showing in tenant's list)
    (source_template_id IS NOT NULL AND import_status = 'imported' AND user_has_tenant_access(auth.uid(), tenant_id))
  )
);

-- Add table for tracking template sync operations
CREATE TABLE IF NOT EXISTS template_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  template_id UUID NOT NULL,
  source_template_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'sync'
  status TEXT NOT NULL, -- 'success', 'partial', 'failed'
  templates_updated INTEGER DEFAULT 0,
  devices_added INTEGER DEFAULT 0,
  devices_updated INTEGER DEFAULT 0,
  devices_skipped INTEGER DEFAULT 0,
  conflict_report JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Add RLS policies for template_sync_logs
ALTER TABLE template_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant access for template sync logs" 
ON template_sync_logs FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add missing columns to device_templates if they don't exist
ALTER TABLE device_templates 
ADD COLUMN IF NOT EXISTS source_template_id UUID,
ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'original',
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;

-- Add missing columns to devices if they don't exist  
ALTER TABLE devices 
ADD COLUMN IF NOT EXISTS source_device_id UUID,
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'original';

-- Create index for better performance on template sync operations
CREATE INDEX IF NOT EXISTS idx_device_templates_source_template_id ON device_templates(source_template_id);
CREATE INDEX IF NOT EXISTS idx_device_templates_import_status ON device_templates(import_status);
CREATE INDEX IF NOT EXISTS idx_devices_source_device_id ON devices(source_device_id);
CREATE INDEX IF NOT EXISTS idx_devices_template_id ON devices(template_id);
CREATE INDEX IF NOT EXISTS idx_devices_import_status ON devices(import_status);