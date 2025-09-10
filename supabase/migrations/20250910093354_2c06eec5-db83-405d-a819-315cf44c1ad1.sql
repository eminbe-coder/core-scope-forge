-- Add name field to contract payment terms to allow custom payment names
ALTER TABLE public.contract_payment_terms 
ADD COLUMN name TEXT;