-- Add new columns to device_template_properties table
ALTER TABLE device_template_properties 
ADD COLUMN property_unit text,
ADD COLUMN is_identifier boolean DEFAULT false;

-- Create device_types table to replace hardcoded categories
CREATE TABLE device_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  is_global boolean NOT NULL DEFAULT true,
  tenant_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for device_types
ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for device_types
CREATE POLICY "Global device types are viewable by everyone" 
ON device_types 
FOR SELECT 
USING (is_global = true);

CREATE POLICY "Tenant device types access" 
ON device_types 
FOR ALL 
USING (
  (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id)) OR
  (is_global = true AND is_super_admin(auth.uid()))
)
WITH CHECK (
  (is_global = false AND user_has_tenant_access(auth.uid(), tenant_id)) OR
  (is_global = true AND is_super_admin(auth.uid()))
);

-- Insert default device types
INSERT INTO device_types (name, description, sort_order, is_global) VALUES
('Lighting', 'Lighting fixtures and equipment', 1, true),
('Controls', 'Control systems and devices', 2, true),
('Sensors', 'Sensor devices and equipment', 3, true),
('Power', 'Power supply and distribution', 4, true),
('Communication', 'Communication and networking devices', 5, true),
('Safety', 'Safety and security equipment', 6, true);

-- Add constraint to ensure only one identifier per template
CREATE UNIQUE INDEX idx_device_template_identifier 
ON device_template_properties (template_id) 
WHERE is_identifier = true;

-- Add trigger for updated_at
CREATE TRIGGER update_device_types_updated_at
BEFORE UPDATE ON device_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();