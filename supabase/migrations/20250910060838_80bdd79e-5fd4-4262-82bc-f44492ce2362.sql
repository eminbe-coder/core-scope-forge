-- Create default payment stages for existing tenants
INSERT INTO contract_payment_stages (tenant_id, name, description, sort_order, active)
SELECT DISTINCT 
  t.id as tenant_id,
  'Due' as name,
  'Payment is due' as description,
  1 as sort_order,
  true as active
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM contract_payment_stages cps 
  WHERE cps.tenant_id = t.id AND cps.name = 'Due'
);

INSERT INTO contract_payment_stages (tenant_id, name, description, sort_order, active)
SELECT DISTINCT 
  t.id as tenant_id,
  'Paid' as name,
  'Payment has been completed' as description,
  2 as sort_order,
  true as active
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM contract_payment_stages cps 
  WHERE cps.tenant_id = t.id AND cps.name = 'Paid'
);

INSERT INTO contract_payment_stages (tenant_id, name, description, sort_order, active)
SELECT DISTINCT 
  t.id as tenant_id,
  'Pending' as name,
  'Payment is pending processing' as description,
  3 as sort_order,
  true as active
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM contract_payment_stages cps 
  WHERE cps.tenant_id = t.id AND cps.name = 'Pending'
);

-- Add sign_date field to contracts table
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS sign_date date DEFAULT CURRENT_DATE;