-- Add enhanced visibility permissions to support department, branch, and selected users
INSERT INTO permissions (name, description, module) VALUES
-- Enhanced visibility permissions
('deals.visibility.own', 'Can only view own deals', 'deals'),
('deals.visibility.department', 'Can view deals from same department', 'deals'),
('deals.visibility.branch', 'Can view deals from same branch', 'deals'),
('deals.visibility.selected_users', 'Can view deals from selected users', 'deals'),
('deals.visibility.all', 'Can view all deals', 'deals'),
('leads.visibility.own', 'Can only view own leads', 'leads'),
('leads.visibility.department', 'Can view leads from same department', 'leads'),
('leads.visibility.branch', 'Can view leads from same branch', 'leads'),
('leads.visibility.selected_users', 'Can view leads from selected users', 'leads'),
('leads.visibility.all', 'Can view all leads', 'leads');

-- Create table for storing selected user visibility permissions
CREATE TABLE IF NOT EXISTS user_visibility_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'deals', 'leads', etc.
  allowed_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, tenant_id, entity_type)
);

-- Enable RLS for user visibility permissions
ALTER TABLE user_visibility_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policy for user visibility permissions
CREATE POLICY "Users can manage their visibility permissions"
  ON user_visibility_permissions
  FOR ALL
  USING (user_has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add trigger for updated_at
CREATE TRIGGER update_user_visibility_permissions_updated_at
  BEFORE UPDATE ON user_visibility_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();