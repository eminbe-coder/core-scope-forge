-- Add missing permissions for devices and reports
INSERT INTO permissions (name, description, module) VALUES 
('devices.view', 'View devices', 'Devices'),
('devices.create', 'Create devices', 'Devices'),
('devices.edit', 'Edit devices', 'Devices'),
('devices.delete', 'Delete devices', 'Devices'),
('reports.view', 'View reports', 'Reports'),
('reports.create', 'Create reports', 'Reports'),
('reports.edit', 'Edit reports', 'Reports'),
('reports.delete', 'Delete reports', 'Reports');

-- Create default role permissions for member role to have basic view permissions
-- This will help users see the sidebar initially before being assigned custom roles
INSERT INTO role_permissions (tenant_id, role, permission_id)
SELECT DISTINCT 
  t.id as tenant_id,
  'member' as role,
  p.id as permission_id
FROM tenants t
CROSS JOIN permissions p
WHERE p.name IN (
  'crm.contacts.view',
  'crm.customers.view', 
  'crm.deals.view',
  'crm.sites.view',
  'crm.activities.view',
  'projects.view',
  'devices.view',
  'reports.view'
)
ON CONFLICT (tenant_id, role, permission_id) DO NOTHING;