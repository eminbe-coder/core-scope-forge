-- Add address column to contacts table and make last_name nullable
ALTER TABLE public.contacts 
ADD COLUMN address text;

-- Make last_name nullable since user wants only first_name to be required
ALTER TABLE public.contacts 
ALTER COLUMN last_name DROP NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.contacts.address IS 'Contact address information';
COMMENT ON COLUMN public.contacts.last_name IS 'Contact last name - optional field';