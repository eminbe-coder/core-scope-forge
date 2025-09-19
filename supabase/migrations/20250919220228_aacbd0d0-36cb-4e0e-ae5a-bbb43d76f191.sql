-- Add soft delete fields to tables that don't have them yet
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE todos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Add soft delete fields to tables that use 'active' field for consistency
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE sites ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create the deleted_items table to track all deletions
CREATE TABLE public.deleted_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_data JSONB NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_by UUID REFERENCES auth.users(id),
  original_table TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on deleted_items
ALTER TABLE public.deleted_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for deleted_items
CREATE POLICY "Tenant access for deleted items" 
ON public.deleted_items 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create function for soft delete operations
CREATE OR REPLACE FUNCTION public.soft_delete_entity(
  _table_name TEXT,
  _entity_id UUID,
  _tenant_id UUID
) RETURNS VOID AS $$
DECLARE
  _entity_data JSONB;
  _query TEXT;
BEGIN
  -- Get the current entity data before deletion
  _query := format('SELECT to_jsonb(row) FROM %I row WHERE id = $1', _table_name);
  EXECUTE _query INTO _entity_data USING _entity_id;
  
  -- Insert into deleted_items table
  INSERT INTO public.deleted_items (
    tenant_id, entity_type, entity_id, entity_data, deleted_by, original_table
  ) VALUES (
    _tenant_id, _table_name, _entity_id, _entity_data, auth.uid(), _table_name
  );
  
  -- Soft delete the entity
  _query := format('UPDATE %I SET deleted_at = now(), deleted_by = auth.uid() WHERE id = $1', _table_name);
  EXECUTE _query USING _entity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore deleted items
CREATE OR REPLACE FUNCTION public.restore_deleted_entity(
  _deleted_item_id UUID
) RETURNS VOID AS $$
DECLARE
  _deleted_item RECORD;
  _query TEXT;
BEGIN
  -- Get the deleted item details
  SELECT * INTO _deleted_item FROM public.deleted_items WHERE id = _deleted_item_id;
  
  IF _deleted_item IS NULL THEN
    RAISE EXCEPTION 'Deleted item not found';
  END IF;
  
  -- Restore the entity by clearing soft delete fields
  _query := format('UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1', _deleted_item.original_table);
  EXECUTE _query USING _deleted_item.entity_id;
  
  -- Remove from deleted_items table
  DELETE FROM public.deleted_items WHERE id = _deleted_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to permanently delete items
CREATE OR REPLACE FUNCTION public.permanently_delete_entity(
  _deleted_item_id UUID
) RETURNS VOID AS $$
DECLARE
  _deleted_item RECORD;
  _query TEXT;
BEGIN
  -- Get the deleted item details
  SELECT * INTO _deleted_item FROM public.deleted_items WHERE id = _deleted_item_id;
  
  IF _deleted_item IS NULL THEN
    RAISE EXCEPTION 'Deleted item not found';
  END IF;
  
  -- Permanently delete the entity
  _query := format('DELETE FROM %I WHERE id = $1', _deleted_item.original_table);
  EXECUTE _query USING _deleted_item.entity_id;
  
  -- Remove from deleted_items table
  DELETE FROM public.deleted_items WHERE id = _deleted_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;