-- Fix the trigger to handle edge function calls where auth.uid() is null
CREATE OR REPLACE FUNCTION public.log_permission_to_activity_logs()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  user_name TEXT;
  target_user_name TEXT;
BEGIN
  -- Get current user ID, skip logging if no authenticated user (e.g., service role from edge functions)
  current_user_id := auth.uid();
  
  -- If no authenticated user (service role), skip activity logging
  IF current_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO user_name
  FROM profiles
  WHERE id = current_user_id;
  
  -- Get target user name
  SELECT COALESCE(first_name || ' ' || last_name, email, 'User')
  INTO target_user_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      tenant_id, entity_id, entity_type, activity_type, title, description, created_by
    ) VALUES (
      NEW.tenant_id, NEW.user_id, 'system', 'user_invited',
      'User Invited: ' || COALESCE(target_user_name, 'New User'),
      'User "' || COALESCE(target_user_name, 'New User') || '" was invited by ' || COALESCE(user_name, 'Admin'),
      current_user_id
    );
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.user_id, 'system', 'role_changed',
        'Role Changed: ' || COALESCE(target_user_name, 'User'),
        'User "' || COALESCE(target_user_name, 'User') || '" role changed from "' || OLD.role || '" to "' || NEW.role || '" by ' || COALESCE(user_name, 'Admin'),
        current_user_id
      );
    END IF;
    
    IF OLD.active IS DISTINCT FROM NEW.active THEN
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.user_id, 'system', CASE WHEN NEW.active THEN 'user_activated' ELSE 'user_deactivated' END,
        CASE WHEN NEW.active THEN 'User Activated: ' ELSE 'User Deactivated: ' END || COALESCE(target_user_name, 'User'),
        'User "' || COALESCE(target_user_name, 'User') || '" was ' || CASE WHEN NEW.active THEN 'activated' ELSE 'deactivated' END || ' by ' || COALESCE(user_name, 'Admin'),
        current_user_id
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;