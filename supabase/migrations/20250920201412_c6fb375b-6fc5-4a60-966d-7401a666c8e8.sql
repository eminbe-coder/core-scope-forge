-- Add formula and depends_on_properties fields to device_template_properties
ALTER TABLE device_template_properties 
ADD COLUMN formula TEXT,
ADD COLUMN depends_on_properties TEXT[];

-- Update the data_type check constraint to include 'calculated'
ALTER TABLE device_template_properties 
DROP CONSTRAINT IF EXISTS device_template_properties_data_type_check;

ALTER TABLE device_template_properties 
ADD CONSTRAINT device_template_properties_data_type_check 
CHECK (data_type IN ('text', 'number', 'select', 'boolean', 'calculated'));