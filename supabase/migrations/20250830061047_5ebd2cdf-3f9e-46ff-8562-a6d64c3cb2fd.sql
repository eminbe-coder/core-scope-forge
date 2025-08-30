-- Create contract todos table
CREATE TABLE public.contract_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  payment_term_id UUID,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  priority TEXT DEFAULT 'medium',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contract audit trail table
CREATE TABLE public.contract_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'todo_added', 'todo_completed', 'payment_stage_changed', etc.
  entity_type TEXT NOT NULL, -- 'contract', 'payment_term', 'todo', 'contact', 'company'
  entity_id UUID,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  user_id UUID NOT NULL,
  user_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.contract_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contract todos
CREATE POLICY "Tenant access for contract todos" ON public.contract_todos
FOR ALL USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create RLS policies for contract audit logs
CREATE POLICY "Tenant access for contract audit logs" ON public.contract_audit_logs
FOR ALL USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create updated_at trigger for contract todos
CREATE TRIGGER update_contract_todos_updated_at
BEFORE UPDATE ON public.contract_todos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically update payment stage when all todos are complete
CREATE OR REPLACE FUNCTION public.update_payment_stage_on_todo_completion()
RETURNS TRIGGER AS $$
DECLARE
  payment_term_record RECORD;
  pending_todos_count INTEGER;
  due_stage_id UUID;
BEGIN
  -- Only proceed if this is a todo completion
  IF TG_OP = 'UPDATE' AND NEW.completed = true AND OLD.completed = false AND NEW.payment_term_id IS NOT NULL THEN
    
    -- Get the payment term details
    SELECT * INTO payment_term_record 
    FROM contract_payment_terms 
    WHERE id = NEW.payment_term_id;
    
    -- Count remaining incomplete todos for this payment
    SELECT COUNT(*) INTO pending_todos_count
    FROM contract_todos 
    WHERE payment_term_id = NEW.payment_term_id 
    AND completed = false 
    AND id != NEW.id; -- Exclude the current todo being completed
    
    -- If no pending todos remain, update payment stage to 'Due'
    IF pending_todos_count = 0 THEN
      -- Get the 'Due' stage ID for this tenant
      SELECT id INTO due_stage_id
      FROM contract_payment_stages
      WHERE tenant_id = NEW.tenant_id
      AND name = 'Due'
      LIMIT 1;
      
      -- Update the payment term stage
      IF due_stage_id IS NOT NULL THEN
        UPDATE contract_payment_terms
        SET stage_id = due_stage_id,
            updated_at = now()
        WHERE id = NEW.payment_term_id;
        
        -- Log the audit trail
        INSERT INTO contract_audit_logs (
          contract_id, tenant_id, action, entity_type, entity_id,
          field_name, old_value, new_value, user_id, user_name, notes
        ) VALUES (
          payment_term_record.contract_id, NEW.tenant_id, 'payment_stage_auto_updated', 
          'payment_term', NEW.payment_term_id,
          'stage_id', 
          to_jsonb(payment_term_record.stage_id), 
          to_jsonb(due_stage_id),
          auth.uid(),
          (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
          'Automatically updated to Due - all todos completed'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto payment stage update
CREATE TRIGGER contract_todo_completion_trigger
  AFTER UPDATE ON public.contract_todos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_stage_on_todo_completion();

-- Create function to set payment stage to 'Due' immediately if no todos exist
CREATE OR REPLACE FUNCTION public.set_payment_due_if_no_todos()
RETURNS TRIGGER AS $$
DECLARE
  todos_count INTEGER;
  due_stage_id UUID;
BEGIN
  -- Check if any todos exist for this payment term
  SELECT COUNT(*) INTO todos_count
  FROM contract_todos 
  WHERE payment_term_id = NEW.id;
  
  -- If no todos exist, set stage to 'Due'
  IF todos_count = 0 THEN
    -- Get the 'Due' stage ID for this tenant
    SELECT id INTO due_stage_id
    FROM contract_payment_stages
    WHERE tenant_id = NEW.tenant_id
    AND name = 'Due'
    LIMIT 1;
    
    -- Update the payment term stage
    IF due_stage_id IS NOT NULL AND (NEW.stage_id IS NULL OR NEW.stage_id != due_stage_id) THEN
      NEW.stage_id := due_stage_id;
      
      -- Log the audit trail
      INSERT INTO contract_audit_logs (
        contract_id, tenant_id, action, entity_type, entity_id,
        field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.contract_id, NEW.tenant_id, 'payment_stage_auto_updated', 
        'payment_term', NEW.id,
        'stage_id', 
        to_jsonb(OLD.stage_id), 
        to_jsonb(due_stage_id),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'Automatically set to Due - no todos required'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment terms
CREATE TRIGGER payment_term_auto_due_trigger
  BEFORE INSERT OR UPDATE ON public.contract_payment_terms
  FOR EACH ROW
  EXECUTE FUNCTION public.set_payment_due_if_no_todos();