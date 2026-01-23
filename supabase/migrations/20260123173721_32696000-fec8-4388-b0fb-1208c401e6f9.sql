-- Create comprehensive activity logging triggers for universal audit trail

-- 1. Trigger for Deals: Stage changes, status updates, creation
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
    
    -- Log status changes
    IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
      SELECT name INTO old_status_name FROM deal_statuses WHERE id = OLD.status_id;
      SELECT name INTO new_status_name FROM deal_statuses WHERE id = NEW.status_id;
      
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

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_log_deal_to_activity_logs ON deals;
CREATE TRIGGER trigger_log_deal_to_activity_logs
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION log_deal_to_activity_logs();

-- 2. Trigger for Contacts: Creation and modification
CREATE OR REPLACE FUNCTION public.log_contact_to_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
  contact_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO user_name
  FROM profiles
  WHERE id = auth.uid();
  
  contact_name := COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.email, 'Unknown');
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      tenant_id, entity_id, entity_type, activity_type, title, description, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, 'contact', 'contact_created',
      'Contact Created: ' || contact_name,
      'Contact "' || contact_name || '" was created by ' || user_name,
      auth.uid()
    );
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Only log significant changes, not every update
    IF OLD.first_name IS DISTINCT FROM NEW.first_name OR OLD.last_name IS DISTINCT FROM NEW.last_name OR OLD.email IS DISTINCT FROM NEW.email THEN
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.id, 'contact', 'contact_updated',
        'Contact Updated: ' || contact_name,
        'Contact "' || contact_name || '" was updated by ' || user_name,
        auth.uid()
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_contact_to_activity_logs ON contacts;
CREATE TRIGGER trigger_log_contact_to_activity_logs
  AFTER INSERT OR UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION log_contact_to_activity_logs();

-- 3. Trigger for Companies: Creation and modification
CREATE OR REPLACE FUNCTION public.log_company_to_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO user_name
  FROM profiles
  WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      tenant_id, entity_id, entity_type, activity_type, title, description, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, 'company', 'company_created',
      'Company Created: ' || NEW.name,
      'Company "' || NEW.name || '" was created by ' || user_name,
      auth.uid()
    );
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.id, 'company', 'company_updated',
        'Company Updated: ' || NEW.name,
        'Company "' || NEW.name || '" was updated by ' || user_name,
        auth.uid()
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_company_to_activity_logs ON companies;
CREATE TRIGGER trigger_log_company_to_activity_logs
  AFTER INSERT OR UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION log_company_to_activity_logs();

-- 4. Trigger for Sites: Creation and modification
CREATE OR REPLACE FUNCTION public.log_site_to_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO user_name
  FROM profiles
  WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      tenant_id, entity_id, entity_type, activity_type, title, description, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, 'site', 'site_created',
      'Site Created: ' || NEW.name,
      'Site "' || NEW.name || '" was created by ' || user_name,
      auth.uid()
    );
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.id, 'site', 'site_updated',
        'Site Updated: ' || NEW.name,
        'Site "' || NEW.name || '" was updated by ' || user_name,
        auth.uid()
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_site_to_activity_logs ON sites;
CREATE TRIGGER trigger_log_site_to_activity_logs
  AFTER INSERT OR UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION log_site_to_activity_logs();

-- 5. Trigger for User Permissions/Roles: Changes to custom_roles and user_tenant_memberships
CREATE OR REPLACE FUNCTION public.log_permission_to_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
  target_user_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO user_name
  FROM profiles
  WHERE id = auth.uid();
  
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
      'User Invited: ' || target_user_name,
      'User "' || target_user_name || '" was invited by ' || user_name,
      auth.uid()
    );
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.user_id, 'system', 'role_changed',
        'Role Changed: ' || target_user_name,
        'User "' || target_user_name || '" role changed from "' || OLD.role || '" to "' || NEW.role || '" by ' || user_name,
        auth.uid()
      );
    END IF;
    
    IF OLD.active IS DISTINCT FROM NEW.active THEN
      INSERT INTO activity_logs (
        tenant_id, entity_id, entity_type, activity_type, title, description, created_by
      ) VALUES (
        NEW.tenant_id, NEW.user_id, 'system', CASE WHEN NEW.active THEN 'user_activated' ELSE 'user_deactivated' END,
        CASE WHEN NEW.active THEN 'User Activated: ' ELSE 'User Deactivated: ' END || target_user_name,
        'User "' || target_user_name || '" was ' || CASE WHEN NEW.active THEN 'activated' ELSE 'deactivated' END || ' by ' || user_name,
        auth.uid()
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_permission_to_activity_logs ON user_tenant_memberships;
CREATE TRIGGER trigger_log_permission_to_activity_logs
  AFTER INSERT OR UPDATE ON user_tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION log_permission_to_activity_logs();

-- 6. Trigger for Custom Roles changes
CREATE OR REPLACE FUNCTION public.log_custom_role_to_activity_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email, 'System')
  INTO user_name
  FROM profiles
  WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (
      tenant_id, entity_id, entity_type, activity_type, title, description, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, 'system', 'role_created',
      'Custom Role Created: ' || NEW.name,
      'Custom role "' || NEW.name || '" was created by ' || user_name,
      auth.uid()
    );
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO activity_logs (
      tenant_id, entity_id, entity_type, activity_type, title, description, created_by
    ) VALUES (
      NEW.tenant_id, NEW.id, 'system', 'role_updated',
      'Custom Role Updated: ' || NEW.name,
      'Custom role "' || NEW.name || '" permissions were updated by ' || user_name,
      auth.uid()
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_custom_role_to_activity_logs ON custom_roles;
CREATE TRIGGER trigger_log_custom_role_to_activity_logs
  AFTER INSERT OR UPDATE ON custom_roles
  FOR EACH ROW EXECUTE FUNCTION log_custom_role_to_activity_logs();

-- Add index for created_by to improve user filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_by ON public.activity_logs(created_by);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON public.activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);