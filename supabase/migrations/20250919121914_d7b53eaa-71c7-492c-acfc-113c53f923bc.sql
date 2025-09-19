-- Create reward system tables
CREATE TABLE public.reward_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  action_name TEXT NOT NULL,
  action_description TEXT,
  points_value INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, action_name)
);

-- Enable RLS
ALTER TABLE public.reward_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for reward configurations
CREATE POLICY "Tenant access for reward configurations" 
ON public.reward_configurations 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create user reward participation table
CREATE TABLE public.user_reward_participation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.user_reward_participation ENABLE ROW LEVEL SECURITY;

-- Create policy for user reward participation
CREATE POLICY "Tenant access for user reward participation" 
ON public.user_reward_participation 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create user reward points table
CREATE TABLE public.user_reward_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.user_reward_points ENABLE ROW LEVEL SECURITY;

-- Create policy for user reward points
CREATE POLICY "Tenant access for user reward points" 
ON public.user_reward_points 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create reward point transactions table
CREATE TABLE public.reward_point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  action_name TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.reward_point_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for reward point transactions
CREATE POLICY "Tenant access for reward point transactions" 
ON public.reward_point_transactions 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create triggers for updated_at columns
CREATE TRIGGER update_reward_configurations_updated_at
BEFORE UPDATE ON public.reward_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_reward_participation_updated_at
BEFORE UPDATE ON public.user_reward_participation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_reward_points_updated_at
BEFORE UPDATE ON public.user_reward_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default reward actions
INSERT INTO public.reward_configurations (tenant_id, action_name, action_description, points_value) 
SELECT t.id, 'complete_todo', 'Complete a todo task', 10
FROM public.tenants t;

INSERT INTO public.reward_configurations (tenant_id, action_name, action_description, points_value) 
SELECT t.id, 'add_site_relation', 'Add a relation to a site', 5
FROM public.tenants t;

INSERT INTO public.reward_configurations (tenant_id, action_name, action_description, points_value) 
SELECT t.id, 'create_deal', 'Create a new deal', 15
FROM public.tenants t;

INSERT INTO public.reward_configurations (tenant_id, action_name, action_description, points_value) 
SELECT t.id, 'create_lead', 'Create a new lead', 10
FROM public.tenants t;

INSERT INTO public.reward_configurations (tenant_id, action_name, action_description, points_value) 
SELECT t.id, 'create_contact', 'Create a new contact', 8
FROM public.tenants t;

INSERT INTO public.reward_configurations (tenant_id, action_name, action_description, points_value) 
SELECT t.id, 'create_company', 'Create a new company', 12
FROM public.tenants t;

INSERT INTO public.reward_configurations (tenant_id, action_name, action_description, points_value) 
SELECT t.id, 'move_deal_stage', 'Move deal between stages', 20
FROM public.tenants t;

INSERT INTO public.reward_configurations (tenant_id, action_name, action_description, points_value) 
SELECT t.id, 'convert_deal_to_contract', 'Convert deal to contract', 50
FROM public.tenants t;

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_points(_user_id UUID, _tenant_id UUID, _action_name TEXT, _entity_type TEXT DEFAULT NULL, _entity_id UUID DEFAULT NULL, _notes TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  points_to_award INTEGER;
  user_participates BOOLEAN;
BEGIN
  -- Check if user participates in reward system
  SELECT active INTO user_participates
  FROM public.user_reward_participation
  WHERE user_id = _user_id AND tenant_id = _tenant_id;
  
  -- If user doesn't participate, exit
  IF user_participates IS NULL OR user_participates = false THEN
    RETURN;
  END IF;
  
  -- Get points for this action
  SELECT points_value INTO points_to_award
  FROM public.reward_configurations
  WHERE tenant_id = _tenant_id 
    AND action_name = _action_name 
    AND active = true;
  
  -- If action not configured or no points, exit
  IF points_to_award IS NULL OR points_to_award = 0 THEN
    RETURN;
  END IF;
  
  -- Insert transaction record
  INSERT INTO public.reward_point_transactions (
    user_id, tenant_id, action_name, points_earned, entity_type, entity_id, notes
  ) VALUES (
    _user_id, _tenant_id, _action_name, points_to_award, _entity_type, _entity_id, _notes
  );
  
  -- Update or create user total points
  INSERT INTO public.user_reward_points (user_id, tenant_id, total_points)
  VALUES (_user_id, _tenant_id, points_to_award)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET 
    total_points = user_reward_points.total_points + points_to_award,
    updated_at = now();
END;
$$;