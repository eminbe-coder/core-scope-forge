-- Add address field to contacts table
ALTER TABLE public.contacts 
ADD COLUMN address TEXT;

-- Add unique constraint for email per tenant
CREATE UNIQUE INDEX contacts_email_tenant_unique 
ON public.contacts (email, tenant_id) 
WHERE email IS NOT NULL AND active = true;

-- Create function to validate email uniqueness per tenant
CREATE OR REPLACE FUNCTION public.validate_contact_email_unique(_email TEXT, _tenant_id UUID, _contact_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow null emails
  IF _email IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if email exists for this tenant (excluding current contact if updating)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.contacts 
    WHERE email = _email 
    AND tenant_id = _tenant_id 
    AND active = true
    AND (_contact_id IS NULL OR id != _contact_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;