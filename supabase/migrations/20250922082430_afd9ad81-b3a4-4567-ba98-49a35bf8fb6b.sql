-- Assign site permissions to admin role for all tenants
INSERT INTO role_permissions (tenant_id, role, permission_id)
SELECT t.id as tenant_id, 'admin'::app_role as role, p.id as permission_id
FROM tenants t
CROSS JOIN permissions p
WHERE p.name IN ('crm.sites.create', 'crm.sites.edit', 'crm.sites.delete')
  AND t.active = true
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.tenant_id = t.id 
    AND rp.role = 'admin' 
    AND rp.permission_id = p.id
  );