-- Add support for new property types in device template properties
ALTER TABLE device_template_properties DROP CONSTRAINT IF EXISTS device_template_properties_property_type_check;

-- Add the updated constraint with the new property types
ALTER TABLE device_template_properties ADD CONSTRAINT device_template_properties_property_type_check 
CHECK (property_type = ANY (ARRAY['text'::text, 'number'::text, 'select'::text, 'multiselect'::text, 'dynamic_multiselect'::text, 'boolean'::text, 'date'::text, 'mixed'::text, 'calculated'::text]));