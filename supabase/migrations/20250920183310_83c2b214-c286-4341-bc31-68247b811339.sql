-- Update the insert trigger or create a function to handle device_type_id properly
-- For now, let's create a simple update after insert to move category data to device_type_id

-- First, let's add a trigger function to automatically populate device_type_id from category field
CREATE OR REPLACE FUNCTION handle_device_template_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If device_type_id is provided but stored in category field, move it
  IF NEW.device_type_id IS NULL AND NEW.category IS NOT NULL THEN
    -- Check if category looks like a UUID (device type ID)
    IF NEW.category ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      NEW.device_type_id := NEW.category::UUID;
      -- Find the device type name to store in category
      SELECT name INTO NEW.category 
      FROM device_types 
      WHERE id = NEW.device_type_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_handle_device_template_insert ON device_templates;
CREATE TRIGGER trigger_handle_device_template_insert
  BEFORE INSERT OR UPDATE ON device_templates
  FOR EACH ROW
  EXECUTE FUNCTION handle_device_template_insert();