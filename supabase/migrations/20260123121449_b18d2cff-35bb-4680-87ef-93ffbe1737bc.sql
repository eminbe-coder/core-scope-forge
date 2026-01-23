-- Standardize on Loose Link approach for polymorphic relationships
-- Create composite index on todos for efficient entity-based queries

-- Create composite index for "All Tasks for Entity X" queries
CREATE INDEX IF NOT EXISTS idx_todos_entity_lookup 
ON public.todos(tenant_id, entity_type, entity_id);

-- Also create individual indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_todos_entity_type ON public.todos(entity_type);
CREATE INDEX IF NOT EXISTS idx_todos_entity_id ON public.todos(entity_id);

-- Add comment documenting the polymorphic pattern
COMMENT ON COLUMN public.todos.entity_type IS 'Loose link polymorphism: deal, project, contract, site, company, contact, quote';
COMMENT ON COLUMN public.todos.entity_id IS 'Loose link polymorphism: UUID of the referenced entity';