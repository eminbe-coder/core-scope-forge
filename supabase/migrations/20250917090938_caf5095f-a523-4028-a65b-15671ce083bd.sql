-- Add support for subtasks and multiple assignees to todos system

-- Add parent_todo_id for hierarchical todos (subtasks)
ALTER TABLE public.todos 
ADD COLUMN parent_todo_id UUID REFERENCES public.todos(id) ON DELETE CASCADE;

-- Create index for better performance on parent-child queries
CREATE INDEX idx_todos_parent_id ON public.todos(parent_todo_id);

-- Create todo_assignees junction table for multiple assignees
CREATE TABLE public.todo_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(todo_id, user_id)
);

-- Enable RLS on todo_assignees
ALTER TABLE public.todo_assignees ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for todo_assignees
CREATE POLICY "Tenant access for todo assignees" 
ON public.todo_assignees 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create trigger for updated_at on todo_assignees
CREATE TRIGGER update_todo_assignees_updated_at
  BEFORE UPDATE ON public.todo_assignees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_todo_assignees_todo_id ON public.todo_assignees(todo_id);
CREATE INDEX idx_todo_assignees_user_id ON public.todo_assignees(user_id);

-- Update the log_todo_audit_trail function to handle multiple assignees
CREATE OR REPLACE FUNCTION public.log_todo_assignee_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Handle INSERT (new assignee)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.todo_audit_logs (
      todo_id, tenant_id, action, field_name, old_value, new_value, user_id, user_name, notes
    ) VALUES (
      NEW.todo_id, NEW.tenant_id, 'assignee_added', 'assignees',
      NULL, to_jsonb(NEW.user_id),
      auth.uid(),
      (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
      'Assignee added to todo'
    );
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (assignee removed)
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.todo_audit_logs (
      todo_id, tenant_id, action, field_name, old_value, new_value, user_id, user_name, notes
    ) VALUES (
      OLD.todo_id, OLD.tenant_id, 'assignee_removed', 'assignees',
      to_jsonb(OLD.user_id), NULL,
      auth.uid(),
      (SELECT first_name || ' ' || last_name FROM profiles WHERE id = auth.uid()),
      'Assignee removed from todo'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for todo assignee audit logging
CREATE TRIGGER todo_assignee_audit_trail
  AFTER INSERT OR DELETE ON public.todo_assignees
  FOR EACH ROW
  EXECUTE FUNCTION public.log_todo_assignee_changes();