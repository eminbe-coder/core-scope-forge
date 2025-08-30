-- Create audit trail trigger for contracts
CREATE OR REPLACE FUNCTION public.log_contract_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO contract_audit_logs (
      contract_id, tenant_id, action, entity_type, entity_id,
      field_name, old_value, new_value, user_id, user_name, notes
    ) VALUES (
      NEW.id, NEW.tenant_id, 'contract_created', 'contract', NEW.id,
      NULL, NULL, to_jsonb(NEW),
      auth.uid(),
      (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
      'Contract created'
    );
    
    -- If contract was created from a deal, inherit deal activity history
    IF NEW.deal_id IS NOT NULL THEN
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes, created_at
      )
      SELECT 
        NEW.id, NEW.tenant_id, 'inherited_from_deal', 'activity', al.id,
        NULL, NULL, to_jsonb(al),
        al.created_by,
        p.first_name || ' ' || p.last_name,
        'Activity inherited from Deal: ' || al.title,
        al.created_at
      FROM activity_logs al
      LEFT JOIN profiles p ON al.created_by = p.id
      WHERE al.entity_type = 'deal' 
        AND al.entity_id = NEW.deal_id 
        AND al.tenant_id = NEW.tenant_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Log specific field changes
    IF OLD.name != NEW.name THEN
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.id, NEW.tenant_id, 'contract_updated', 'contract', NEW.id,
        'name', to_jsonb(OLD.name), to_jsonb(NEW.name),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'Contract name changed'
      );
    END IF;
    
    IF OLD.status != NEW.status THEN
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.id, NEW.tenant_id, 'contract_status_updated', 'contract', NEW.id,
        'status', to_jsonb(OLD.status), to_jsonb(NEW.status),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'Contract status changed from ' || OLD.status || ' to ' || NEW.status
      );
    END IF;
    
    IF OLD.value != NEW.value THEN
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.id, NEW.tenant_id, 'contract_value_updated', 'contract', NEW.id,
        'value', to_jsonb(OLD.value), to_jsonb(NEW.value),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'Contract value changed'
      );
    END IF;
    
    IF OLD.assigned_to != NEW.assigned_to THEN
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.id, NEW.tenant_id, 'contract_assigned', 'contract', NEW.id,
        'assigned_to', to_jsonb(OLD.assigned_to), to_jsonb(NEW.assigned_to),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'Contract assignment changed'
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for contract audit logging
DROP TRIGGER IF EXISTS contract_audit_trigger ON contracts;
CREATE TRIGGER contract_audit_trigger
  AFTER INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION log_contract_audit_trail();

-- Create audit trail trigger for contract payment terms
CREATE OR REPLACE FUNCTION public.log_payment_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO contract_audit_logs (
      contract_id, tenant_id, action, entity_type, entity_id,
      field_name, old_value, new_value, user_id, user_name, notes
    ) VALUES (
      NEW.contract_id, NEW.tenant_id, 'payment_term_created', 'payment_term', NEW.id,
      NULL, NULL, to_jsonb(NEW),
      auth.uid(),
      (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
      'Payment installment ' || NEW.installment_number || ' created'
    );
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id != NEW.stage_id THEN
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.contract_id, NEW.tenant_id, 'payment_stage_updated', 'payment_term', NEW.id,
        'stage_id', to_jsonb(OLD.stage_id), to_jsonb(NEW.stage_id),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'Payment installment ' || NEW.installment_number || ' stage updated'
      );
    END IF;
    
    IF OLD.due_date != NEW.due_date THEN
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.contract_id, NEW.tenant_id, 'payment_due_date_updated', 'payment_term', NEW.id,
        'due_date', to_jsonb(OLD.due_date), to_jsonb(NEW.due_date),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'Payment installment ' || NEW.installment_number || ' due date updated'
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for payment audit logging
DROP TRIGGER IF EXISTS payment_audit_trigger ON contract_payment_terms;
CREATE TRIGGER payment_audit_trigger
  AFTER INSERT OR UPDATE ON contract_payment_terms
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_audit_trail();

-- Create audit trail trigger for contract todos
CREATE OR REPLACE FUNCTION public.log_todo_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO contract_audit_logs (
      contract_id, tenant_id, action, entity_type, entity_id,
      field_name, old_value, new_value, user_id, user_name, notes
    ) VALUES (
      NEW.contract_id, NEW.tenant_id, 'todo_created', 'todo', NEW.id,
      NULL, NULL, to_jsonb(NEW),
      auth.uid(),
      (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
      'To-Do task created: ' || NEW.title
    );
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    IF OLD.completed != NEW.completed AND NEW.completed = true THEN
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.contract_id, NEW.tenant_id, 'todo_completed', 'todo', NEW.id,
        'completed', to_jsonb(OLD.completed), to_jsonb(NEW.completed),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'To-Do task completed: ' || NEW.title
      );
    END IF;
    
    IF OLD.assigned_to != NEW.assigned_to THEN
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.contract_id, NEW.tenant_id, 'todo_assigned', 'todo', NEW.id,
        'assigned_to', to_jsonb(OLD.assigned_to), to_jsonb(NEW.assigned_to),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'To-Do task reassigned: ' || NEW.title
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for todo audit logging
DROP TRIGGER IF EXISTS todo_audit_trigger ON contract_todos;
CREATE TRIGGER todo_audit_trigger
  AFTER INSERT OR UPDATE ON contract_todos
  FOR EACH ROW
  EXECUTE FUNCTION log_todo_audit_trail();

-- Function to check if user can modify contract
CREATE OR REPLACE FUNCTION public.user_can_modify_contract(_contract_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contracts c
    JOIN user_tenant_memberships utm ON c.tenant_id = utm.tenant_id
    WHERE c.id = _contract_id
      AND utm.user_id = _user_id
      AND utm.active = true
      AND (
        -- User is assigned to contract
        c.assigned_to = _user_id
        -- Or user is admin/super_admin
        OR utm.role IN ('admin', 'super_admin')
      )
  );
$$;