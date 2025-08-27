-- Create deal stages table for tenant-specific deal stages
CREATE TABLE public.deal_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  win_percentage integer NOT NULL DEFAULT 0 CHECK (win_percentage >= 0 AND win_percentage <= 100),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name),
  UNIQUE(tenant_id, sort_order)
);

-- Enable RLS
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Tenant access for deal stages" 
ON public.deal_stages 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add stage_id to deals table
ALTER TABLE public.deals ADD COLUMN stage_id uuid REFERENCES public.deal_stages(id);

-- Create trigger for updated_at
CREATE TRIGGER update_deal_stages_updated_at
BEFORE UPDATE ON public.deal_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();