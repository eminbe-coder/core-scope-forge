-- Make entity_id nullable to support standalone to-dos
ALTER TABLE public.todos ALTER COLUMN entity_id DROP NOT NULL;

-- Add a comment explaining the nullable behavior
COMMENT ON COLUMN public.todos.entity_id IS 'Nullable - NULL when entity_type is standalone';