-- Update mahmood's user to have the correct custom role
UPDATE user_tenant_memberships 
SET role = 'member', custom_role_id = '409cf044-e2aa-4ffc-9a1c-73d90b4d9b6a'
WHERE user_id = (SELECT id FROM profiles WHERE email = 'mahmood@essenisa.bh')
AND active = true;