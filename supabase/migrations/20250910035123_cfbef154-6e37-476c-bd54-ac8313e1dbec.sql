-- Create deal_statuses table for configurable deal statuses
CREATE TABLE public.deal_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenant access for deal statuses" 
ON public.deal_statuses 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add deal_status_id to deals table
ALTER TABLE public.deals ADD COLUMN deal_status_id UUID;

-- Create foreign key constraint
ALTER TABLE public.deals ADD CONSTRAINT fk_deals_deal_status 
FOREIGN KEY (deal_status_id) REFERENCES public.deal_statuses(id);

-- Add converted_to_contract_id to deals table to track conversion
ALTER TABLE public.deals ADD COLUMN converted_to_contract_id UUID;
ALTER TABLE public.deals ADD COLUMN is_converted BOOLEAN NOT NULL DEFAULT false;

-- Create foreign key constraint for converted contract
ALTER TABLE public.deals ADD CONSTRAINT fk_deals_converted_contract 
FOREIGN KEY (converted_to_contract_id) REFERENCES public.contracts(id);

-- Create trigger for updated_at
CREATE TRIGGER update_deal_statuses_updated_at
BEFORE UPDATE ON public.deal_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default deal statuses for existing tenants
INSERT INTO public.deal_statuses (tenant_id, name, description, sort_order)
SELECT 
  t.id as tenant_id,
  unnest(ARRAY['Active', 'Not Active', 'Paused', 'Lost']) as name,
  unnest(ARRAY[
    'Deal is actively being pursued',
    'Deal is inactive or on hold',
    'Deal is temporarily paused',
    'Deal has been lost to competitor or cancelled'
  ]) as description,
  unnest(ARRAY[1, 2, 3, 4]) as sort_order
FROM public.tenants t;

-- Set default deal status to 'Active' for existing deals
UPDATE public.deals 
SET deal_status_id = (
  SELECT ds.id 
  FROM public.deal_statuses ds 
  WHERE ds.tenant_id = deals.tenant_id 
  AND ds.name = 'Active' 
  LIMIT 1
)
WHERE deal_status_id IS NULL;