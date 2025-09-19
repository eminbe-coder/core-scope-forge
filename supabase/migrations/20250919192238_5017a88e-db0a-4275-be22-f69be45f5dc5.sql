-- Add missing todo permissions to admin role
INSERT INTO role_permissions (role_name, permission_id, tenant_id)
SELECT 'admin', p.id, NULL
FROM permissions p
WHERE p.name IN ('todos.view', 'todos.edit', 'todos.create', 'todos.delete', 'todos.assign')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_name = 'admin' 
  AND rp.permission_id = p.id 
  AND rp.tenant_id IS NULL
);