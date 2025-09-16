-- Add calendar view preferences to user_todo_preferences table
ALTER TABLE public.user_todo_preferences 
ADD COLUMN calendar_height integer DEFAULT 700,
ADD COLUMN calendar_view text DEFAULT 'week',
ADD COLUMN calendar_date timestamp with time zone DEFAULT now(),
ADD COLUMN column_widths jsonb DEFAULT '{}',
ADD COLUMN time_slot_height integer DEFAULT 30;