-- Create assignment permissions table
CREATE TABLE public.user_assignment_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('deals', 'leads', 'todos', 'activities')),
  assignment_scope TEXT NOT NULL CHECK (assignment_scope IN ('own', 'department', 'branch', 'selected_users', 'all')),
  selected_user_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, entity_type)
);

-- Enable RLS
ALTER TABLE public.user_assignment_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own assignment permissions" 
ON public.user_assignment_permissions 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all assignment permissions" 
ON public.user_assignment_permissions 
FOR ALL 
USING (is_tenant_admin_for(tenant_id)) 
WITH CHECK (is_tenant_admin_for(tenant_id));

-- Create function to get user's assignment scope for an entity type
CREATE OR REPLACE FUNCTION public.get_user_assignment_scope(_user_id UUID, _tenant_id UUID, _entity_type TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT assignment_scope 
     FROM user_assignment_permissions 
     WHERE user_id = _user_id 
       AND tenant_id = _tenant_id 
       AND entity_type = _entity_type),
    'own'  -- Default to 'own' if no specific permission set
  );
$$;

-- Create function to check if user can assign to another user
CREATE OR REPLACE FUNCTION public.can_user_assign_to(_assigner_id UUID, _assignee_id UUID, _tenant_id UUID, _entity_type TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN _assigner_id = _assignee_id THEN true  -- Can always assign to self
      WHEN is_tenant_admin_for(_tenant_id) THEN true  -- Admins can assign to anyone
      ELSE
        CASE get_user_assignment_scope(_assigner_id, _tenant_id, _entity_type)
          WHEN 'all' THEN true
          WHEN 'selected_users' THEN (
            SELECT _assignee_id = ANY(
              SELECT unnest(selected_user_ids) 
              FROM user_assignment_permissions 
              WHERE user_id = _assigner_id 
                AND tenant_id = _tenant_id 
                AND entity_type = _entity_type
            )
          )
          WHEN 'department' THEN (
            EXISTS (
              SELECT 1 FROM user_department_assignments uda1
              JOIN user_department_assignments uda2 ON uda1.department_id = uda2.department_id
              WHERE uda1.user_id = _assigner_id 
                AND uda2.user_id = _assignee_id 
                AND uda1.tenant_id = _tenant_id 
                AND uda2.tenant_id = _tenant_id
            )
          )
          WHEN 'branch' THEN (
            EXISTS (
              SELECT 1 FROM user_department_assignments uda1
              JOIN departments d1 ON uda1.department_id = d1.id
              JOIN user_department_assignments uda2 ON uda2.user_id = _assignee_id
              JOIN departments d2 ON uda2.department_id = d2.id
              WHERE uda1.user_id = _assigner_id 
                AND d1.branch_id = d2.branch_id
                AND uda1.tenant_id = _tenant_id 
                AND uda2.tenant_id = _tenant_id
            )
          )
          ELSE false  -- 'own' scope means can only assign to self
        END
    END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_user_assignment_permissions_updated_at
  BEFORE UPDATE ON public.user_assignment_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();