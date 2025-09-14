-- Create user todo preferences table for storing filter, sort, and view preferences
CREATE TABLE public.user_todo_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  view_type TEXT NOT NULL DEFAULT 'list', -- 'list' or 'calendar'
  filter_status TEXT DEFAULT 'all',
  filter_priority TEXT DEFAULT 'all',
  filter_type TEXT DEFAULT 'all',
  filter_assigned TEXT DEFAULT 'all',
  filter_category TEXT DEFAULT 'all',
  filter_due_date TEXT DEFAULT 'all',
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.user_todo_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own todo preferences" 
ON public.user_todo_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_todo_preferences_updated_at
BEFORE UPDATE ON public.user_todo_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();