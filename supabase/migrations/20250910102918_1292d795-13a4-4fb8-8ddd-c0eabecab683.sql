-- Add payment received tracking to contract_payment_terms table
ALTER TABLE public.contract_payment_terms 
ADD COLUMN IF NOT EXISTS received_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS received_date date,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_contract_payment_terms_status ON public.contract_payment_terms(payment_status);

-- Update existing records to have pending status
UPDATE public.contract_payment_terms 
SET payment_status = 'pending' 
WHERE payment_status IS NULL;