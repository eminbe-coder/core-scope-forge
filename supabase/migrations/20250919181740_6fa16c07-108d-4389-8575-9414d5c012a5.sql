-- Create reward periods table to define period types
CREATE TABLE public.reward_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reward period cycles table to track active/historical periods
CREATE TABLE public.reward_period_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user reward targets table for individual targets per user per period
CREATE TABLE public.user_reward_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_cycle_id UUID NOT NULL REFERENCES public.reward_period_cycles(id) ON DELETE CASCADE,
  target_points INTEGER NOT NULL DEFAULT 100,
  current_points INTEGER NOT NULL DEFAULT 0,
  achieved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, period_cycle_id)
);

-- Enable RLS
ALTER TABLE public.reward_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_period_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reward_targets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant access for reward periods" 
ON public.reward_periods 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant access for reward period cycles" 
ON public.reward_period_cycles 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant access for user reward targets" 
ON public.user_reward_targets 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add triggers for updated_at
CREATE TRIGGER update_reward_periods_updated_at
  BEFORE UPDATE ON public.reward_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reward_period_cycles_updated_at
  BEFORE UPDATE ON public.reward_period_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_reward_targets_updated_at
  BEFORE UPDATE ON public.user_reward_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default weekly period configuration for existing tenants
INSERT INTO public.reward_periods (tenant_id, period_type, is_active)
SELECT id, 'weekly', true FROM public.tenants WHERE active = true;

-- Create initial current week cycle for each tenant
INSERT INTO public.reward_period_cycles (tenant_id, period_type, start_date, end_date, is_current)
SELECT 
  t.id,
  'weekly',
  DATE_TRUNC('week', CURRENT_DATE)::DATE,
  (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE,
  true
FROM public.tenants t WHERE t.active = true;

-- Update award_points function to work with periods
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _tenant_id uuid, _action_name text, _entity_type text DEFAULT NULL::text, _entity_id uuid DEFAULT NULL::uuid, _notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  points_to_award INTEGER;
  user_participates BOOLEAN;
  current_cycle_id UUID;
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
  
  -- Get current period cycle
  SELECT id INTO current_cycle_id
  FROM public.reward_period_cycles
  WHERE tenant_id = _tenant_id AND is_current = true
  LIMIT 1;
  
  -- Insert transaction record
  INSERT INTO public.reward_point_transactions (
    user_id, tenant_id, action_name, points_earned, entity_type, entity_id, notes
  ) VALUES (
    _user_id, _tenant_id, _action_name, points_to_award, _entity_type, _entity_id, _notes
  );
  
  -- Update or create user total points (all-time)
  INSERT INTO public.user_reward_points (user_id, tenant_id, total_points)
  VALUES (_user_id, _tenant_id, points_to_award)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET 
    total_points = user_reward_points.total_points + points_to_award,
    updated_at = now();
    
  -- Update current period target progress if exists
  IF current_cycle_id IS NOT NULL THEN
    UPDATE public.user_reward_targets 
    SET 
      current_points = current_points + points_to_award,
      achieved = (current_points + points_to_award) >= target_points,
      updated_at = now()
    WHERE user_id = _user_id 
      AND tenant_id = _tenant_id 
      AND period_cycle_id = current_cycle_id;
  END IF;
END;
$function$;