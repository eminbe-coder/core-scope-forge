-- Create deal_sources table
CREATE TABLE public.deal_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Tenant access for deal sources" 
ON public.deal_sources 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add source_id to deals table
ALTER TABLE public.deals ADD COLUMN source_id UUID REFERENCES deal_sources(id);

-- Insert default deal sources
INSERT INTO public.deal_sources (name, description, sort_order, tenant_id) 
SELECT 
  sources.source_name,
  sources.source_description,
  sources.source_order,
  t.id as tenant_id
FROM (
  VALUES 
    ('Website', 'Leads from company website', 0),
    ('Referral', 'Customer referrals', 1),
    ('Cold Call', 'Cold calling campaigns', 2),
    ('Social Media', 'Social media platforms', 3),
    ('Trade Show', 'Trade shows and events', 4),
    ('Email Campaign', 'Email marketing campaigns', 5),
    ('Partner', 'Partner referrals', 6),
    ('Direct Sales', 'Direct sales approach', 7)
) AS sources(source_name, source_description, source_order)
CROSS JOIN public.tenants t;

-- Create trigger for updated_at
CREATE TRIGGER update_deal_sources_updated_at
  BEFORE UPDATE ON public.deal_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();