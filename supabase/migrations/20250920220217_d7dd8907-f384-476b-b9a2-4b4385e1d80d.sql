-- Fix global template save error: Allow NULL tenant_id for device_template_options
-- This aligns with device_templates table which allows NULL tenant_id for global templates

-- Remove the NOT NULL constraint from tenant_id column
ALTER TABLE device_template_options 
ALTER COLUMN tenant_id DROP NOT NULL;