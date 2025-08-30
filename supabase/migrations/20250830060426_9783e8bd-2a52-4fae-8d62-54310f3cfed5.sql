-- Create contract payment stages table for tenant-customizable stages
CREATE TABLE public.contract_payment_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  deal_id UUID,
  customer_id UUID,
  site_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  value NUMERIC,
  currency_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  signed_date DATE,
  start_date DATE,
  end_date DATE,
  customer_reference_number TEXT,
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contract payment terms table
CREATE TABLE public.contract_payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  installment_number INTEGER NOT NULL,
  amount_type TEXT NOT NULL,
  amount_value NUMERIC NOT NULL,
  calculated_amount NUMERIC,
  due_date DATE,
  stage_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contract payment attachments table
CREATE TABLE public.contract_payment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_term_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  attachment_type TEXT NOT NULL, -- 'proforma', 'receipt', 'other'
  created_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contract contacts junction table
CREATE TABLE public.contract_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  role TEXT DEFAULT 'contact',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contract companies junction table  
CREATE TABLE public.contract_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  company_id UUID NOT NULL,
  relationship_type TEXT DEFAULT 'client',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.contract_payment_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant access for contract payment stages" ON public.contract_payment_stages
FOR ALL USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant access for contracts" ON public.contracts
FOR ALL USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant access for contract payment terms" ON public.contract_payment_terms
FOR ALL USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant access for contract payment attachments" ON public.contract_payment_attachments
FOR ALL USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant access for contract contacts" ON public.contract_contacts
FOR ALL USING (EXISTS (
  SELECT 1 FROM contracts 
  WHERE contracts.id = contract_contacts.contract_id 
  AND user_has_tenant_access(auth.uid(), contracts.tenant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM contracts 
  WHERE contracts.id = contract_contacts.contract_id 
  AND user_has_tenant_access(auth.uid(), contracts.tenant_id)
));

CREATE POLICY "Tenant access for contract companies" ON public.contract_companies
FOR ALL USING (EXISTS (
  SELECT 1 FROM contracts 
  WHERE contracts.id = contract_companies.contract_id 
  AND user_has_tenant_access(auth.uid(), contracts.tenant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM contracts 
  WHERE contracts.id = contract_companies.contract_id 
  AND user_has_tenant_access(auth.uid(), contracts.tenant_id)
));

-- Create updated_at triggers
CREATE TRIGGER update_contract_payment_stages_updated_at
BEFORE UPDATE ON public.contract_payment_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_payment_terms_updated_at
BEFORE UPDATE ON public.contract_payment_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_payment_attachments_updated_at
BEFORE UPDATE ON public.contract_payment_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default payment stages
INSERT INTO public.contract_payment_stages (tenant_id, name, description, sort_order) 
SELECT DISTINCT tenant_id, 'Pending Task', 'Payment preparation stage', 1 FROM tenants WHERE active = true;

INSERT INTO public.contract_payment_stages (tenant_id, name, description, sort_order) 
SELECT DISTINCT tenant_id, 'Due', 'Payment is due', 2 FROM tenants WHERE active = true;

INSERT INTO public.contract_payment_stages (tenant_id, name, description, sort_order) 
SELECT DISTINCT tenant_id, 'Paid', 'Payment completed', 3 FROM tenants WHERE active = true;