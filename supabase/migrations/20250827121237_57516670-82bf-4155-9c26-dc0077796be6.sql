-- Create junction table for deal-company relationships
CREATE TABLE public.deal_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'client',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deal_id, company_id)
);

-- Create junction table for deal-contact relationships  
CREATE TABLE public.deal_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'contact',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(deal_id, contact_id)
);

-- Enable RLS on new tables
ALTER TABLE public.deal_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deal_companies
CREATE POLICY "Tenant access for deal companies"
ON public.deal_companies
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM deals
    WHERE deals.id = deal_companies.deal_id
    AND user_has_tenant_access(auth.uid(), deals.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM deals
    WHERE deals.id = deal_companies.deal_id
    AND user_has_tenant_access(auth.uid(), deals.tenant_id)
  )
);

-- Create RLS policies for deal_contacts
CREATE POLICY "Tenant access for deal contacts"
ON public.deal_contacts
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM deals
    WHERE deals.id = deal_contacts.deal_id
    AND user_has_tenant_access(auth.uid(), deals.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM deals
    WHERE deals.id = deal_contacts.deal_id
    AND user_has_tenant_access(auth.uid(), deals.tenant_id)
  )
);