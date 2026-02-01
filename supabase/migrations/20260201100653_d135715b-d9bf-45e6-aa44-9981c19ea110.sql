-- Create user_google_credentials table for storing OAuth tokens
CREATE TABLE public.user_google_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comments for clarity
COMMENT ON TABLE public.user_google_credentials IS 'Stores Google OAuth credentials for individual users';
COMMENT ON COLUMN public.user_google_credentials.scopes IS 'Array of OAuth scopes granted by the user';

-- Enable Row Level Security
ALTER TABLE public.user_google_credentials ENABLE ROW LEVEL SECURITY;

-- RLS policies: Users can only access their own credentials
CREATE POLICY "Users can view their own Google credentials"
ON public.user_google_credentials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google credentials"
ON public.user_google_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google credentials"
ON public.user_google_credentials
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google credentials"
ON public.user_google_credentials
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_google_credentials_updated_at
  BEFORE UPDATE ON public.user_google_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add google_calendar_sync column to todos if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'todos' 
    AND column_name = 'google_calendar_sync'
  ) THEN
    ALTER TABLE public.todos ADD COLUMN google_calendar_sync BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'todos' 
    AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE public.todos ADD COLUMN google_event_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'todos' 
    AND column_name = 'location'
  ) THEN
    ALTER TABLE public.todos ADD COLUMN location TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'todos' 
    AND column_name = 'location_site_id'
  ) THEN
    ALTER TABLE public.todos ADD COLUMN location_site_id UUID REFERENCES public.sites(id);
  END IF;
END $$;