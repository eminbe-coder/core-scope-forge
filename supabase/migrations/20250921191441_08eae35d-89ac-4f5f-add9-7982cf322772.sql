-- Add is_device_name field to device_template_properties table
ALTER TABLE device_template_properties 
ADD COLUMN is_device_name boolean DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN device_template_properties.is_device_name IS 'Indicates if this property should be used as the device name when creating devices from this template';