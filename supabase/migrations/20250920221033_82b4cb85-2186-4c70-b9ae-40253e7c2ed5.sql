-- Add soft delete support to device templates table
ALTER TABLE device_templates 
ADD COLUMN deleted_at timestamp with time zone,
ADD COLUMN deleted_by uuid REFERENCES auth.users(id);

-- Update RLS policies to filter out soft-deleted templates
DROP POLICY IF EXISTS "Global device templates are viewable by everyone" ON device_templates;
DROP POLICY IF EXISTS "Tenant device templates access" ON device_templates;

-- Recreate policies with soft delete filter
CREATE POLICY "Global device templates are viewable by everyone" 
ON device_templates 
FOR SELECT 
USING (is_global = true AND deleted_at IS NULL);

CREATE POLICY "Tenant device templates access" 
ON device_templates 
FOR ALL 
USING (
  (((is_global = false) AND user_has_tenant_access(auth.uid(), tenant_id)) OR 
   ((is_global = true) AND is_super_admin(auth.uid()))) AND 
  deleted_at IS NULL
)
WITH CHECK (
  (((is_global = false) AND user_has_tenant_access(auth.uid(), tenant_id)) OR 
   ((is_global = true) AND is_super_admin(auth.uid()))) AND 
  deleted_at IS NULL
);

-- Clean up duplicate templates - keep only the most recent one for each duplicate set
WITH duplicate_templates AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY created_at DESC) as rn
  FROM device_templates
  WHERE name IS NOT NULL AND TRIM(name) != ''
)
DELETE FROM device_templates 
WHERE id IN (
  SELECT id FROM duplicate_templates WHERE rn > 1
);