-- Add account_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN account_id INTEGER UNIQUE;

-- Create index for fast lookups
CREATE INDEX idx_profiles_account_id ON public.profiles(account_id);

-- Function to generate unique 6-digit account ID
CREATE OR REPLACE FUNCTION public.generate_unique_account_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id INTEGER;
  done BOOLEAN := false;
BEGIN
  WHILE NOT done LOOP
    -- Generate random 6-digit number (100000-999999)
    new_id := floor(random() * 900000 + 100000)::INTEGER;
    
    -- Check if it's unique
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE account_id = new_id) THEN
      done := true;
    END IF;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- Migrate existing users with unique 6-digit IDs
DO $$
DECLARE
  profile_record RECORD;
  new_account_id INTEGER;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles WHERE account_id IS NULL
  LOOP
    new_account_id := public.generate_unique_account_id();
    UPDATE public.profiles SET account_id = new_account_id WHERE id = profile_record.id;
  END LOOP;
END;
$$;

-- Make account_id NOT NULL after migration
ALTER TABLE public.profiles ALTER COLUMN account_id SET NOT NULL;

-- Update handle_new_user trigger to include account_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, account_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    public.generate_unique_account_id()
  );
  RETURN NEW;
END;
$$;

-- Function to get user by account_id (for login)
CREATE OR REPLACE FUNCTION public.get_user_by_account_id(_account_id INTEGER)
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE p.account_id = _account_id;
$$;