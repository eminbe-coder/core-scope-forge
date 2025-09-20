-- Add parent_device_type_id to device_types for hierarchical structure
ALTER TABLE device_types ADD COLUMN parent_device_type_id UUID REFERENCES device_types(id);

-- Create index for better performance on hierarchy queries
CREATE INDEX idx_device_types_parent ON device_types(parent_device_type_id);

-- Add some example sub-types for lights
INSERT INTO device_types (name, description, parent_device_type_id, sort_order, active, is_global) 
SELECT 
    'Downlight' as name,
    'Recessed downlight fixtures' as description,
    dt.id as parent_device_type_id,
    1 as sort_order,
    true as active,
    true as is_global
FROM device_types dt 
WHERE dt.name = 'Lights' AND dt.is_global = true
LIMIT 1;

INSERT INTO device_types (name, description, parent_device_type_id, sort_order, active, is_global) 
SELECT 
    'Outdoor Light' as name,
    'Outdoor lighting fixtures' as description,
    dt.id as parent_device_type_id,
    2 as sort_order,
    true as active,
    true as is_global
FROM device_types dt 
WHERE dt.name = 'Lights' AND dt.is_global = true
LIMIT 1;

INSERT INTO device_types (name, description, parent_device_type_id, sort_order, active, is_global) 
SELECT 
    'Track Light' as name,
    'Track lighting systems' as description,
    dt.id as parent_device_type_id,
    3 as sort_order,
    true as active,
    true as is_global
FROM device_types dt 
WHERE dt.name = 'Lights' AND dt.is_global = true
LIMIT 1;