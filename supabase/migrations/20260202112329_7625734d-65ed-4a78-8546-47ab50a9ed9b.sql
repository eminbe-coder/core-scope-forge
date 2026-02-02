-- Create RPC function to search users universally (SECURITY DEFINER to bypass RLS)
-- This function searches the profiles table and returns user info for admin purposes
CREATE OR REPLACE FUNCTION public.search_users_universally(
  search_term TEXT,
  search_type TEXT DEFAULT 'email' -- 'email' or 'account_id'
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  account_id INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin/super_admin users to use this function
  IF NOT is_admin_or_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can search users';
  END IF;

  IF search_type = 'account_id' THEN
    -- Search by account_id (must be exact 6-digit match)
    RETURN QUERY
    SELECT 
      p.id,
      p.email,
      p.first_name,
      p.last_name,
      p.account_id,
      p.created_at
    FROM profiles p
    WHERE p.account_id = search_term::INTEGER;
  ELSE
    -- Search by email (case-insensitive exact match)
    RETURN QUERY
    SELECT 
      p.id,
      p.email,
      p.first_name,
      p.last_name,
      p.account_id,
      p.created_at
    FROM profiles p
    WHERE LOWER(p.email) = LOWER(search_term);
  END IF;
END;
$$;