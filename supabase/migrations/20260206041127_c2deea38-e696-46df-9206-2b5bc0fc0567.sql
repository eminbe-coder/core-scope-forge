-- Add is_active column for soft-deactivation of relationships (Employee Shift workflow)
ALTER TABLE public.entity_relationships 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add start_date and end_date for relationship timeline
ALTER TABLE public.entity_relationships 
ADD COLUMN start_date TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE public.entity_relationships 
ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;

-- Create index for efficient active relationship queries
CREATE INDEX idx_entity_relationships_active ON public.entity_relationships (entity_type, entity_id, is_active);

-- Create index for timeline queries
CREATE INDEX idx_entity_relationships_timeline ON public.entity_relationships (company_id, contact_id, start_date);

-- Add trigger to set end_date when deactivating
CREATE OR REPLACE FUNCTION public.handle_relationship_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    NEW.end_date = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_entity_relationships_deactivation
  BEFORE UPDATE ON public.entity_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_relationship_deactivation();