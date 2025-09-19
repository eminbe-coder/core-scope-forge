-- Update functions to fix search path security warnings
CREATE OR REPLACE FUNCTION public.soft_delete_entity(
  _table_name TEXT,
  _entity_id UUID,
  _tenant_id UUID
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update restore function
CREATE OR REPLACE FUNCTION public.restore_deleted_entity(
  _deleted_item_id UUID
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update permanent delete function
CREATE OR REPLACE FUNCTION public.permanently_delete_entity(
  _deleted_item_id UUID
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;