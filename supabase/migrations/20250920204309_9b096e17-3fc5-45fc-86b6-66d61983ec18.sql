-- Add short description fields to device templates
ALTER TABLE device_templates 
ADD COLUMN short_description_generation_type text DEFAULT 'dynamic',
ADD COLUMN short_description_formula text;

-- Update the version tracking trigger to include new fields
CREATE OR REPLACE FUNCTION update_template_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment version if actual content changed (not just updated_at)
  IF (OLD.name IS DISTINCT FROM NEW.name OR 
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.sku_formula IS DISTINCT FROM NEW.sku_formula OR
      OLD.description_formula IS DISTINCT FROM NEW.description_formula OR
      OLD.short_description_formula IS DISTINCT FROM NEW.short_description_formula OR
      OLD.device_type_id IS DISTINCT FROM NEW.device_type_id) THEN
    NEW.template_version = OLD.template_version + 1;
    NEW.last_modified_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;