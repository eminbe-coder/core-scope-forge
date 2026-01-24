-- Create user_emails table to store secondary emails for users
CREATE TABLE public.user_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;

-- Users can view their own emails
CREATE POLICY "Users can view their own emails"
  ON public.user_emails
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own emails
CREATE POLICY "Users can insert their own emails"
  ON public.user_emails
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own emails
CREATE POLICY "Users can update their own emails"
  ON public.user_emails
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own emails
CREATE POLICY "Users can delete their own emails"
  ON public.user_emails
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all emails (for edge functions)
CREATE POLICY "Service role can manage all emails"
  ON public.user_emails
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups by email
CREATE INDEX idx_user_emails_email ON public.user_emails(email);
CREATE INDEX idx_user_emails_user_id ON public.user_emails(user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_emails_updated_at
  BEFORE UPDATE ON public.user_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();