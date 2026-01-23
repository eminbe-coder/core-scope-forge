-- Update soft_delete_entity to include activity logging
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
  _entity_name TEXT;
  _user_name TEXT;
  _query TEXT;
BEGIN
  -- Get the current entity data before deletion
  _query := format('SELECT to_jsonb(row) FROM %I row WHERE id = $1', _table_name);
  EXECUTE _query INTO _entity_data USING _entity_id;
  
  -- Extract entity name from data
  _entity_name := COALESCE(
    _entity_data->>'name',
    _entity_data->>'title',
    CONCAT(_entity_data->>'first_name', ' ', _entity_data->>'last_name'),
    'Unknown Item'
  );
  
  -- Get user name for activity log
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO _user_name
  FROM profiles
  WHERE id = auth.uid();
  
  -- Insert into deleted_items table
  INSERT INTO public.deleted_items (
    tenant_id, entity_type, entity_id, entity_data, deleted_by, original_table
  ) VALUES (
    _tenant_id, _table_name, _entity_id, _entity_data, auth.uid(), _table_name
  );
  
  -- Soft delete the entity
  _query := format('UPDATE %I SET deleted_at = now(), deleted_by = auth.uid() WHERE id = $1', _table_name);
  EXECUTE _query USING _entity_id;
  
  -- Log to activity_logs
  INSERT INTO public.activity_logs (
    tenant_id, entity_id, entity_type, activity_type, title, description, created_by
  ) VALUES (
    _tenant_id,
    _entity_id,
    _table_name,
    'soft_deleted',
    'Moved to Recycle Bin: ' || _entity_name,
    'Record "' || _entity_name || '" was moved to the Recycle Bin by ' || _user_name,
    auth.uid()
  );
END;
$$;

-- Update restore_deleted_entity to include activity logging
CREATE OR REPLACE FUNCTION public.restore_deleted_entity(
  _deleted_item_id UUID
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted_item RECORD;
  _entity_name TEXT;
  _user_name TEXT;
  _query TEXT;
BEGIN
  -- Get the deleted item details
  SELECT * INTO _deleted_item FROM public.deleted_items WHERE id = _deleted_item_id;
  
  IF _deleted_item IS NULL THEN
    RAISE EXCEPTION 'Deleted item not found';
  END IF;
  
  -- Extract entity name from data
  _entity_name := COALESCE(
    _deleted_item.entity_data->>'name',
    _deleted_item.entity_data->>'title',
    CONCAT(_deleted_item.entity_data->>'first_name', ' ', _deleted_item.entity_data->>'last_name'),
    'Unknown Item'
  );
  
  -- Get user name for activity log
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO _user_name
  FROM profiles
  WHERE id = auth.uid();
  
  -- Restore the entity by clearing soft delete fields
  _query := format('UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1', _deleted_item.original_table);
  EXECUTE _query USING _deleted_item.entity_id;
  
  -- Log to activity_logs
  INSERT INTO public.activity_logs (
    tenant_id, entity_id, entity_type, activity_type, title, description, created_by
  ) VALUES (
    _deleted_item.tenant_id,
    _deleted_item.entity_id,
    _deleted_item.original_table,
    'restored',
    'Restored from Recycle Bin: ' || _entity_name,
    'Record "' || _entity_name || '" was restored from the Recycle Bin by ' || _user_name,
    auth.uid()
  );
  
  -- Remove from deleted_items table
  DELETE FROM public.deleted_items WHERE id = _deleted_item_id;
END;
$$;