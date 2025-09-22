-- Add device and device template permissions
INSERT INTO public.permissions (name, description, module) VALUES
-- Device permissions
('devices.view', 'View devices', 'devices'),
('devices.create', 'Create new devices', 'devices'),
('devices.edit', 'Edit existing devices', 'devices'),
('devices.delete', 'Delete devices', 'devices'),

-- Device template permissions
('device_templates.view', 'View device templates', 'device_templates'),
('device_templates.create', 'Create new device templates', 'device_templates'),
('device_templates.edit', 'Edit existing device templates', 'device_templates'),
('device_templates.delete', 'Delete device templates', 'device_templates')

ON CONFLICT (name) DO NOTHING;