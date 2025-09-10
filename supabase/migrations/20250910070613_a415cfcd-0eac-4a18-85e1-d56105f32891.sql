-- Create enum types for todo system
CREATE TYPE public.todo_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.todo_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create todo types table (configurable per tenant)
CREATE TABLE public.todo_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'CheckCircle',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create universal todos table
CREATE TABLE public.todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type_id UUID REFERENCES public.todo_types(id),
  due_date DATE,
  status public.todo_status NOT NULL DEFAULT 'pending',
  priority public.todo_priority NOT NULL DEFAULT 'medium',
  
  -- Flexible entity linking
  entity_type TEXT NOT NULL, -- 'contract', 'deal', 'lead', 'customer', 'contact', 'site', 'company', 'project', etc.
  entity_id UUID NOT NULL,
  
  -- Additional context fields
  payment_term_id UUID, -- For contract payment specific todos
  notes TEXT,
  
  -- User assignments
  created_by UUID NOT NULL,
  assigned_to UUID,
  completed_by UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create todo assignments table (for multiple assignees)
CREATE TABLE public.todo_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL,
  UNIQUE(todo_id, user_id)
);

-- Create todo audit logs table
CREATE TABLE public.todo_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'assigned', 'completed', 'status_changed', etc.
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  user_id UUID,
  user_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.todo_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for todo_types
CREATE POLICY "Tenant access for todo types"
  ON public.todo_types
  FOR ALL
  USING (user_has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create RLS policies for todos
CREATE POLICY "Tenant access for todos"
  ON public.todos
  FOR ALL
  USING (user_has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create RLS policies for todo_assignments
CREATE POLICY "Tenant access for todo assignments"
  ON public.todo_assignments
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.todos 
    WHERE todos.id = todo_assignments.todo_id 
    AND user_has_tenant_access(auth.uid(), todos.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.todos 
    WHERE todos.id = todo_assignments.todo_id 
    AND user_has_tenant_access(auth.uid(), todos.tenant_id)
  ));

-- Create RLS policies for todo_audit_logs
CREATE POLICY "Tenant access for todo audit logs"
  ON public.todo_audit_logs
  FOR ALL
  USING (user_has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add indexes for performance
CREATE INDEX idx_todos_tenant_id ON public.todos(tenant_id);
CREATE INDEX idx_todos_entity ON public.todos(entity_type, entity_id);
CREATE INDEX idx_todos_assigned_to ON public.todos(assigned_to);
CREATE INDEX idx_todos_status ON public.todos(status);
CREATE INDEX idx_todos_due_date ON public.todos(due_date);
CREATE INDEX idx_todo_assignments_todo_id ON public.todo_assignments(todo_id);
CREATE INDEX idx_todo_assignments_user_id ON public.todo_assignments(user_id);
CREATE INDEX idx_todo_audit_logs_todo_id ON public.todo_audit_logs(todo_id);

-- Create triggers for updated_at
CREATE TRIGGER update_todo_types_updated_at
  BEFORE UPDATE ON public.todo_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default todo types for existing tenants
INSERT INTO public.todo_types (tenant_id, name, description, color, icon, sort_order)
SELECT 
  t.id as tenant_id,
  'General Task' as name,
  'General administrative task' as description,
  '#3B82F6' as color,
  'CheckCircle' as icon,
  1 as sort_order
FROM public.tenants t
WHERE t.active = true;

INSERT INTO public.todo_types (tenant_id, name, description, color, icon, sort_order)
SELECT 
  t.id as tenant_id,
  'Payment Follow-up' as name,
  'Payment collection and follow-up task' as description,
  '#F59E0B' as color,
  'CreditCard' as icon,
  2 as sort_order
FROM public.tenants t
WHERE t.active = true;

INSERT INTO public.todo_types (tenant_id, name, description, color, icon, sort_order)
SELECT 
  t.id as tenant_id,
  'Document Review' as name,
  'Document review and approval task' as description,
  '#8B5CF6' as color,
  'FileText' as icon,
  3 as sort_order
FROM public.tenants t
WHERE t.active = true;

INSERT INTO public.todo_types (tenant_id, name, description, color, icon, sort_order)
SELECT 
  t.id as tenant_id,
  'Client Communication' as name,
  'Client communication and follow-up' as description,
  '#10B981' as color,
  'MessageCircle' as icon,
  4 as sort_order
FROM public.tenants t
WHERE t.active = true;

-- Migrate existing contract_todos to the new universal system
INSERT INTO public.todos (
  tenant_id, title, description, due_date, status, priority,
  entity_type, entity_id, payment_term_id, notes,
  created_by, assigned_to, completed_by, created_at, updated_at, completed_at,
  type_id
)
SELECT 
  ct.tenant_id,
  ct.title,
  ct.description,
  ct.due_date,
  CASE 
    WHEN ct.completed = true THEN 'completed'::public.todo_status
    ELSE 'pending'::public.todo_status
  END as status,
  CASE 
    WHEN ct.priority = 'high' THEN 'high'::public.todo_priority
    WHEN ct.priority = 'low' THEN 'low'::public.todo_priority
    ELSE 'medium'::public.todo_priority
  END as priority,
  'contract' as entity_type,
  ct.contract_id as entity_id,
  ct.payment_term_id,
  'Migrated from contract_todos' as notes,
  ct.created_by,
  ct.assigned_to,
  ct.completed_by,
  ct.created_at,
  ct.updated_at,
  ct.completed_at,
  -- Assign appropriate type based on payment_term_id
  CASE 
    WHEN ct.payment_term_id IS NOT NULL THEN (
      SELECT tt.id FROM public.todo_types tt 
      WHERE tt.tenant_id = ct.tenant_id AND tt.name = 'Payment Follow-up' 
      LIMIT 1
    )
    ELSE (
      SELECT tt.id FROM public.todo_types tt 
      WHERE tt.tenant_id = ct.tenant_id AND tt.name = 'General Task' 
      LIMIT 1
    )
  END as type_id
FROM public.contract_todos ct;

-- Create function to automatically log todo changes
CREATE OR REPLACE FUNCTION public.log_todo_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.todo_audit_logs (
      todo_id, tenant_id, action, old_value, new_value, user_id, user_name, notes
    ) VALUES (
      NEW.id, NEW.tenant_id, 'todo_created', NULL, to_jsonb(NEW),
      auth.uid(),
      (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
      'To-Do task created: ' || NEW.title
    );
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO public.todo_audit_logs (
        todo_id, tenant_id, action, field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.id, NEW.tenant_id, 'status_changed', 'status',
        to_jsonb(OLD.status), to_jsonb(NEW.status),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'Status changed from ' || OLD.status || ' to ' || NEW.status
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to != NEW.assigned_to OR (OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL) OR (OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL) THEN
      INSERT INTO public.todo_audit_logs (
        todo_id, tenant_id, action, field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.id, NEW.tenant_id, 'todo_assigned', 'assigned_to',
        to_jsonb(OLD.assigned_to), to_jsonb(NEW.assigned_to),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'Assignment changed'
      );
    END IF;
    
    -- Log completion
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      INSERT INTO public.todo_audit_logs (
        todo_id, tenant_id, action, field_name, old_value, new_value, user_id, user_name, notes
      ) VALUES (
        NEW.id, NEW.tenant_id, 'todo_completed', 'completed',
        to_jsonb(false), to_jsonb(true),
        auth.uid(),
        (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
        'To-Do task completed: ' || NEW.title
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for todo audit logging
CREATE TRIGGER log_todos_audit_trail
  AFTER INSERT OR UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_todo_audit_trail();

-- Update the payment stage automation to work with new todos system
CREATE OR REPLACE FUNCTION public.update_payment_stage_on_todo_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_term_record RECORD;
  pending_todos_count INTEGER;
  due_stage_id UUID;
BEGIN
  -- Only proceed if this is a todo completion for a contract payment term
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' 
     AND NEW.entity_type = 'contract' AND NEW.payment_term_id IS NOT NULL THEN
    
    -- Get the payment term details
    SELECT * INTO payment_term_record 
    FROM contract_payment_terms 
    WHERE id = NEW.payment_term_id;
    
    -- Count remaining incomplete todos for this payment
    SELECT COUNT(*) INTO pending_todos_count
    FROM public.todos 
    WHERE entity_type = 'contract'
    AND payment_term_id = NEW.payment_term_id 
    AND status != 'completed'
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
$$;