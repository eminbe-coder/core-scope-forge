-- Add formula and depends_on_properties fields to device_template_properties
ALTER TABLE device_template_properties 
ADD COLUMN formula TEXT,
ADD COLUMN depends_on_properties TEXT[];