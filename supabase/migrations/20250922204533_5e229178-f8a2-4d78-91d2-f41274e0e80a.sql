-- Add fields to track template and device relationships and import status
ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES device_templates(id);
ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'original';
ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;

ALTER TABLE devices ADD COLUMN IF NOT EXISTS source_device_id UUID REFERENCES devices(id);
ALTER TABLE devices ADD COLUMN IF NOT EXISTS import_status TEXT DEFAULT 'original';
ALTER TABLE devices ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS sync_version INTEGER DEFAULT 1;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS identity_hash TEXT;

-- Create template import logs table
CREATE TABLE IF NOT EXISTS template_import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES device_templates(id),
  action_type TEXT NOT NULL, -- 'import', 'sync', 'clone', 'delete'
  status TEXT NOT NULL, -- 'success', 'partial', 'failed'
  devices_imported INTEGER DEFAULT 0,
  devices_skipped INTEGER DEFAULT 0,
  devices_updated INTEGER DEFAULT 0,
  conflict_report JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create device import conflicts table
CREATE TABLE IF NOT EXISTS device_import_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  import_log_id UUID NOT NULL REFERENCES template_import_logs(id),
  global_device_id UUID NOT NULL,
  conflict_reason TEXT NOT NULL,
  device_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE template_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_import_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant access for template import logs" ON template_import_logs
  FOR ALL USING (user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant access for device import conflicts" ON device_import_conflicts
  FOR ALL USING (user_has_tenant_access(auth.uid(), tenant_id));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_templates_source_template ON device_templates(source_template_id);
CREATE INDEX IF NOT EXISTS idx_devices_source_device ON devices(source_device_id);
CREATE INDEX IF NOT EXISTS idx_devices_identity_hash ON devices(identity_hash);
CREATE INDEX IF NOT EXISTS idx_template_import_logs_tenant ON template_import_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_import_conflicts_tenant ON device_import_conflicts(tenant_id);

-- Create function to generate device identity hash
CREATE OR REPLACE FUNCTION generate_device_identity_hash(device_name TEXT, device_brand TEXT, device_model TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN md5(LOWER(TRIM(device_name)) || '|' || LOWER(TRIM(COALESCE(device_brand, ''))) || '|' || LOWER(TRIM(COALESCE(device_model, ''))));
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically generate identity hash for devices
CREATE OR REPLACE FUNCTION update_device_identity_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.identity_hash = generate_device_identity_hash(NEW.name, NEW.brand, NEW.model);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER device_identity_hash_trigger
  BEFORE INSERT OR UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_device_identity_hash();