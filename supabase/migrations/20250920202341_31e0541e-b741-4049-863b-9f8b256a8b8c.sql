-- Add template versioning fields to device_templates
ALTER TABLE device_templates 
ADD COLUMN template_version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN last_modified_by UUID;

-- Create trigger to auto-increment version and update last_modified_by on updates
CREATE OR REPLACE FUNCTION update_template_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment version if actual content changed (not just updated_at)
  IF (OLD.name IS DISTINCT FROM NEW.name OR 
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.sku_formula IS DISTINCT FROM NEW.sku_formula OR
      OLD.description_formula IS DISTINCT FROM NEW.description_formula OR
      OLD.device_type_id IS DISTINCT FROM NEW.device_type_id) THEN
    NEW.template_version = OLD.template_version + 1;
    NEW.last_modified_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_update_template_version
  BEFORE UPDATE ON device_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_version();