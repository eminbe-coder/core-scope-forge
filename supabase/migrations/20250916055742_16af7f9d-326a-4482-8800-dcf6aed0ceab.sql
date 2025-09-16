-- Add duration field to todos table
ALTER TABLE todos ADD COLUMN duration INTEGER DEFAULT 10; -- duration in minutes, default 10 minutes
COMMENT ON COLUMN todos.duration IS 'Task duration in minutes';

-- Create working hours settings table
CREATE TABLE user_working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  working_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 1=Monday, 7=Sunday
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  custom_holidays DATE[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS on working hours table
ALTER TABLE user_working_hours ENABLE ROW LEVEL SECURITY;

-- Create policy for user working hours
CREATE POLICY "Users can manage their own working hours"
ON user_working_hours
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_working_hours_updated_at
BEFORE UPDATE ON user_working_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();