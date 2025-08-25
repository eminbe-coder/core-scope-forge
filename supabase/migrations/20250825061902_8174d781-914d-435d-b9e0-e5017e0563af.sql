-- Create companies table
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  website text,
  industry text,
  size text,
  headquarters text,
  phone text,
  email text,
  logo_url text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Tenant access for companies" ON public.companies
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create junction table for company-customer relationships
CREATE TABLE public.company_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  relationship_type text DEFAULT 'partner', -- partner, subsidiary, parent, etc.
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, customer_id)
);

-- Enable RLS
ALTER TABLE public.company_customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for company_customers
CREATE POLICY "Tenant access for company customers" ON public.company_customers
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.companies
  WHERE companies.id = company_customers.company_id
    AND user_has_tenant_access(auth.uid(), companies.tenant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.companies
  WHERE companies.id = company_customers.company_id
    AND user_has_tenant_access(auth.uid(), companies.tenant_id)
));

-- Create junction table for company-deal relationships
CREATE TABLE public.company_deals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  relationship_type text DEFAULT 'client', -- client, vendor, partner, etc.
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, deal_id)
);

-- Enable RLS
ALTER TABLE public.company_deals ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for company_deals
CREATE POLICY "Tenant access for company deals" ON public.company_deals
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.companies
  WHERE companies.id = company_deals.company_id
    AND user_has_tenant_access(auth.uid(), companies.tenant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.companies
  WHERE companies.id = company_deals.company_id
    AND user_has_tenant_access(auth.uid(), companies.tenant_id)
));

-- Create junction table for company-contact relationships
CREATE TABLE public.company_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  position text, -- position within the company
  department text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for company_contacts
CREATE POLICY "Tenant access for company contacts" ON public.company_contacts
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.companies
  WHERE companies.id = company_contacts.company_id
    AND user_has_tenant_access(auth.uid(), companies.tenant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.companies
  WHERE companies.id = company_contacts.company_id
    AND user_has_tenant_access(auth.uid(), companies.tenant_id)
));

-- Add updated_at trigger for companies table
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();