-- Add customer reference number field to deals table
ALTER TABLE public.deals 
ADD COLUMN customer_reference_number TEXT;