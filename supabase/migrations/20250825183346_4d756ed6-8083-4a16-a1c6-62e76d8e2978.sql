-- Add is_lead field to contacts table
ALTER TABLE public.contacts 
ADD COLUMN is_lead boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.contacts.is_lead IS 'Indicates if this contact is marked as a lead';