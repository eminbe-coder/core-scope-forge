-- Create user dashboard settings table for storing layout preferences
CREATE TABLE public.user_dashboard_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  layout_locked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_dashboard_settings_user_id_key UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own settings
CREATE POLICY "Users can manage their own dashboard settings"
ON public.user_dashboard_settings
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_dashboard_settings_updated_at
BEFORE UPDATE ON public.user_dashboard_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();