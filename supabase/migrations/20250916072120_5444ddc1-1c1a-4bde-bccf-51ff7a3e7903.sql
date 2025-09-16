-- Add start_time column to todos table
ALTER TABLE public.todos 
ADD COLUMN start_time TIME;

-- Add index for better performance on start_time queries
CREATE INDEX idx_todos_start_time ON public.todos(start_time);

-- Add comment to describe the column
COMMENT ON COLUMN public.todos.start_time IS 'The time when the task should start, works with due_time and duration for auto-calculation';