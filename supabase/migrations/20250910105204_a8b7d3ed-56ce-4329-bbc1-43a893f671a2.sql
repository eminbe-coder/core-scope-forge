-- Create contract payment records table to track multiple payments per installment
CREATE TABLE public.contract_payment_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_term_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  amount_received numeric NOT NULL,
  received_date date NOT NULL,
  notes text,
  registered_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_payment_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Tenant access for contract payment records" 
ON public.contract_payment_records 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add trigger for updated_at
CREATE TRIGGER update_contract_payment_records_updated_at
BEFORE UPDATE ON public.contract_payment_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add payment_status column to contract_payment_terms if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contract_payment_terms' 
                   AND column_name = 'payment_status') THEN
        ALTER TABLE public.contract_payment_terms 
        ADD COLUMN payment_status text DEFAULT 'pending';
    END IF;
END $$;