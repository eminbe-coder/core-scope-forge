-- Add device_type_id column to device_templates table
ALTER TABLE device_templates ADD COLUMN device_type_id UUID REFERENCES device_types(id);

-- Update existing records to use a default device type (optional)
-- This assumes you have at least one device type in the system
UPDATE device_templates 
SET device_type_id = (
  SELECT id FROM device_types 
  WHERE is_global = true 
  ORDER BY sort_order 
  LIMIT 1
) 
WHERE device_type_id IS NULL;

-- Create index for better performance
CREATE INDEX idx_device_templates_device_type_id ON device_templates(device_type_id);