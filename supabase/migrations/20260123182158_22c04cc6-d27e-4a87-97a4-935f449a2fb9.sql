-- Fix the trigger function to use correct column name (deal_status_id instead of status_id)
CREATE OR REPLACE FUNCTION public.log_deal_to_activity_logs()
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
  old_stage_name TEXT;
  new_stage_name TEXT;
  old_status_name TEXT;
  new_status_name TEXT;
BEGIN
  -- Get user name
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO user_name
  FROM profiles
  WHERE id = auth.uid();
  
  -- Handle INSERT (deal created)
  IF TG_OP = 'INSERT' THEN
    action_title := 'Deal Created: ' || NEW.name;
    action_description := 'Deal "' || NEW.name || '" was created by ' || user_name;
    activity_action_type := 'deal_created';
    
    INSERT INTO activity_logs (
      tenant_id, entity_id, entity_type, activity_type, title, description, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, 'deal', activity_action_type, action_title, action_description, auth.uid()
    );
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Log stage changes
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
      SELECT name INTO old_stage_name FROM deal_stages WHERE id = OLD.stage_id;
      SELECT name INTO new_stage_name FROM deal_stages WHERE id = NEW.stage_id;
      
      action_title := 'Deal Stage Changed: ' || NEW.name;
      action_description := 'Deal "' || NEW.name || '" stage changed from "' || COALESCE(old_stage_name, 'None') || '" to "' || COALESCE(new_stage_name, 'None') || '" by ' || user_name;
      activity_action_type := 'deal_stage_changed';
      
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.id, 'deal', activity_action_type, action_title, action_description, auth.uid()
      );
    END IF;
    
    -- Log status changes (fixed: use deal_status_id instead of status_id)
    IF OLD.deal_status_id IS DISTINCT FROM NEW.deal_status_id THEN
      SELECT name INTO old_status_name FROM deal_statuses WHERE id = OLD.deal_status_id;
      SELECT name INTO new_status_name FROM deal_statuses WHERE id = NEW.deal_status_id;
      
      action_title := 'Deal Status Changed: ' || NEW.name;
      action_description := 'Deal "' || NEW.name || '" status changed from "' || COALESCE(old_status_name, 'None') || '" to "' || COALESCE(new_status_name, 'None') || '" by ' || user_name;
      activity_action_type := 'deal_status_changed';
      
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.id, 'deal', activity_action_type, action_title, action_description, auth.uid()
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      action_title := 'Deal Reassigned: ' || NEW.name;
      action_description := 'Deal "' || NEW.name || '" was reassigned by ' || user_name;
      activity_action_type := 'deal_assigned';
      
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.id, 'deal', activity_action_type, action_title, action_description, auth.uid()
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;