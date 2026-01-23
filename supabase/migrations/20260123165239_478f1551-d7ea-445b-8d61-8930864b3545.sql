-- Create trigger function to log todo changes to activity_logs
CREATE OR REPLACE FUNCTION public.log_todo_to_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
  action_title TEXT;
  action_description TEXT;
  activity_action_type TEXT;
BEGIN
  -- Get user name
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO user_name
  FROM profiles
  WHERE id = auth.uid();
  
  -- Handle INSERT (new todo created)
  IF TG_OP = 'INSERT' THEN
    action_title := 'To-Do Created: ' || NEW.title;
    action_description := 'To-Do "' || NEW.title || '" was created by ' || user_name;
    activity_action_type := 'todo_created';
    
    -- Only log if entity_type and entity_id are set (linked to an entity)
    IF NEW.entity_type IS NOT NULL AND NEW.entity_type != 'standalone' AND NEW.entity_id IS NOT NULL THEN
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.entity_id, NEW.entity_type, activity_action_type, action_title, action_description, auth.uid()
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Only log if entity_type and entity_id are set (linked to an entity)
    IF NEW.entity_type IS NOT NULL AND NEW.entity_type != 'standalone' AND NEW.entity_id IS NOT NULL THEN
      
      -- Log status changes (especially completion)
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'completed' THEN
          action_title := 'To-Do Completed: ' || NEW.title;
          action_description := 'To-Do "' || NEW.title || '" was completed by ' || user_name;
          activity_action_type := 'todo_completed';
        ELSE
          action_title := 'To-Do Status Changed: ' || NEW.title;
          action_description := 'To-Do "' || NEW.title || '" status changed from ' || COALESCE(OLD.status, 'pending') || ' to ' || NEW.status || ' by ' || user_name;
          activity_action_type := 'todo_status_changed';
        END IF;
        
        INSERT INTO activity_logs (
          tenant_id, entity_id, entity_type, activity_type, title, description, created_by
        ) VALUES (
          NEW.tenant_id, NEW.entity_id, NEW.entity_type, activity_action_type, action_title, action_description, auth.uid()
        );
      END IF;
      
      -- Log assignment changes
      IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        action_title := 'To-Do Reassigned: ' || NEW.title;
        action_description := 'To-Do "' || NEW.title || '" assignment was changed by ' || user_name;
        activity_action_type := 'todo_assigned';
        
        INSERT INTO activity_logs (
          tenant_id, entity_id, entity_type, activity_type, title, description, created_by
        ) VALUES (
          NEW.tenant_id, NEW.entity_id, NEW.entity_type, activity_action_type, action_title, action_description, auth.uid()
        );
      END IF;
      
      -- Log title changes
      IF OLD.title IS DISTINCT FROM NEW.title THEN
        action_title := 'To-Do Updated';
        action_description := 'To-Do title changed from "' || OLD.title || '" to "' || NEW.title || '" by ' || user_name;
        activity_action_type := 'todo_updated';
        
        INSERT INTO activity_logs (
          tenant_id, entity_id, entity_type, activity_type, title, description, created_by
        ) VALUES (
          NEW.tenant_id, NEW.entity_id, NEW.entity_type, activity_action_type, action_title, action_description, auth.uid()
        );
      END IF;
      
      -- Log due date changes
      IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
        action_title := 'To-Do Due Date Changed: ' || NEW.title;
        action_description := 'To-Do "' || NEW.title || '" due date was ' || 
          CASE 
            WHEN OLD.due_date IS NULL THEN 'set to ' || NEW.due_date::TEXT
            WHEN NEW.due_date IS NULL THEN 'removed'
            ELSE 'changed from ' || OLD.due_date::TEXT || ' to ' || NEW.due_date::TEXT
          END || ' by ' || user_name;
        activity_action_type := 'todo_updated';
        
        INSERT INTO activity_logs (
          tenant_id, entity_id, entity_type, activity_type, title, description, created_by
        ) VALUES (
          NEW.tenant_id, NEW.entity_id, NEW.entity_type, activity_action_type, action_title, action_description, auth.uid()
        );
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger on todos table
DROP TRIGGER IF EXISTS trigger_log_todo_to_activity_logs ON todos;
CREATE TRIGGER trigger_log_todo_to_activity_logs
  AFTER INSERT OR UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION log_todo_to_activity_logs();