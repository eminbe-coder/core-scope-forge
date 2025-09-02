-- Create commission configurations table
CREATE TABLE public.commission_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  earning_rules JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of earning rules
  calculation_method TEXT NOT NULL CHECK (calculation_method IN ('fixed', 'percentage', 'stage_based')),
  fixed_amount NUMERIC,
  percentage_rate NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commission stages table for stage-based commissions
CREATE TABLE public.commission_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_configuration_id UUID NOT NULL REFERENCES commission_configurations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  stage_name TEXT NOT NULL,
  min_threshold NUMERIC NOT NULL,
  max_threshold NUMERIC,
  threshold_type TEXT NOT NULL CHECK (threshold_type IN ('percentage', 'fixed')),
  commission_rate NUMERIC NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_stages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for commission_configurations
CREATE POLICY "Tenant access for commission configurations"
ON public.commission_configurations
FOR ALL
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create RLS policies for commission_stages
CREATE POLICY "Tenant access for commission stages"
ON public.commission_stages
FOR ALL
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create triggers for updated_at
CREATE TRIGGER update_commission_configurations_updated_at
  BEFORE UPDATE ON public.commission_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_stages_updated_at
  BEFORE UPDATE ON public.commission_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_commission_configurations_tenant_id ON public.commission_configurations(tenant_id);
CREATE INDEX idx_commission_stages_tenant_id ON public.commission_stages(tenant_id);
CREATE INDEX idx_commission_stages_configuration_id ON public.commission_stages(commission_configuration_id);
CREATE INDEX idx_commission_stages_sort_order ON public.commission_stages(commission_configuration_id, sort_order);