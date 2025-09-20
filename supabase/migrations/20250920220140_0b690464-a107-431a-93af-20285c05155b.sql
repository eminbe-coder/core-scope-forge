-- Fix global template save error: Allow NULL tenant_id for device_template_options
-- This aligns with device_templates table which allows NULL tenant_id for global templates

-- Remove the NOT NULL constraint from tenant_id column
ALTER TABLE device_template_options 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Add a check constraint to ensure data integrity
-- NULL tenant_id is only allowed when the template is global
ALTER TABLE device_template_options
ADD CONSTRAINT tenant_id_required_for_non_global
CHECK (
  tenant_id IS NOT NULL OR EXISTS (
    SELECT 1 FROM device_templates dt
    WHERE dt.id = device_template_options.template_id
    AND dt.is_global = true
  )
);