-- Add super_admin role to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Commit the transaction to make the new enum value available
COMMIT;

-- Update moaath@essensia.bh to super_admin role in a separate transaction
BEGIN;
UPDATE user_tenant_memberships 
SET role = 'super_admin' 
WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'moaath@essensia.bh'
);
COMMIT;