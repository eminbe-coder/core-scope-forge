-- Clean up all global device templates and associated data to fix RLS errors
-- Handle foreign key constraints properly

-- First, clean up devices that reference global templates
UPDATE devices 
SET template_id = NULL 
WHERE template_id IN (
  SELECT id FROM device_templates WHERE is_global = true
);

-- Reset any global devices that were imported from deleted templates
UPDATE devices 
SET source_device_id = NULL,
    imported_at = NULL,
    last_synced_at = NULL,
    sync_version = 1,
    import_status = 'original'
WHERE is_global = true AND source_device_id IS NOT NULL;

-- Delete all device template options for global templates
DELETE FROM device_template_options 
WHERE template_id IN (
  SELECT id FROM device_templates WHERE is_global = true
);

-- Delete all device template properties for global templates  
DELETE FROM device_template_properties
WHERE template_id IN (
  SELECT id FROM device_templates WHERE is_global = true
);

-- Delete all template sync logs for global templates
DELETE FROM template_sync_logs
WHERE source_template_id IN (
  SELECT id FROM device_templates WHERE is_global = true
)
OR template_id IN (
  SELECT id FROM device_templates WHERE is_global = true
);

-- Now we can safely delete all global device templates
DELETE FROM device_templates WHERE is_global = true;

-- Clean up any remaining orphaned device_template_properties
DELETE FROM device_template_properties 
WHERE template_id NOT IN (
  SELECT id FROM device_templates
);

-- Clean up any remaining orphaned device_template_options
DELETE FROM device_template_options 
WHERE template_id NOT IN (
  SELECT id FROM device_templates
);