-- Add priority enum type
CREATE TYPE public.deal_priority AS ENUM ('low', 'medium', 'high');

-- Add priority column to deals table
ALTER TABLE public.deals ADD COLUMN priority public.deal_priority DEFAULT 'medium';

-- Create payment terms table for flexible installment management
CREATE TABLE public.deal_payment_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  amount_type text NOT NULL CHECK (amount_type IN ('fixed', 'percentage')),
  amount_value numeric NOT NULL,
  calculated_amount numeric,
  due_date date,
  notes text,
  tenant_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(deal_id, installment_number)
);

-- Enable RLS
ALTER TABLE public.deal_payment_terms ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Tenant access for deal payment terms" 
ON public.deal_payment_terms 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_deal_payment_terms_updated_at
BEFORE UPDATE ON public.deal_payment_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();