-- =====================================================
-- SID MASTER SCHEMA ALIGNMENT: Fluid Relationship Logic
-- =====================================================

-- 1. Add company_id and contact_id to deals table (Fluid Entity Model)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON public.deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON public.deals(contact_id);

-- 2. Add company_id and contact_id to contracts table (Fluid Entity Model)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contact_id ON public.contracts(contact_id);

-- 3. Create subtask roll-up function for todos
-- When a child todo is updated, auto-calculate parent's due_date and total duration

CREATE OR REPLACE FUNCTION public.update_parent_todo_aggregates()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_id UUID;
  total_duration INTEGER;
  max_due_date DATE;
BEGIN
  -- Get the parent todo ID based on operation type
  IF TG_OP = 'DELETE' THEN
    parent_id := OLD.parent_todo_id;
  ELSE
    parent_id := NEW.parent_todo_id;
  END IF;
  
  -- Only proceed if there's a parent
  IF parent_id IS NOT NULL THEN
    -- Calculate aggregates from all child todos
    SELECT 
      COALESCE(SUM(duration), 0),
      MAX(due_date)
    INTO total_duration, max_due_date
    FROM public.todos
    WHERE parent_todo_id = parent_id
      AND deleted_at IS NULL;
    
    -- Update the parent todo with aggregated values
    UPDATE public.todos
    SET 
      duration = total_duration,
      due_date = COALESCE(max_due_date, due_date),
      updated_at = now()
    WHERE id = parent_id;
    
    -- Log the auto-update
    INSERT INTO public.todo_audit_logs (
      todo_id, tenant_id, action, field_name, 
      old_value, new_value, user_id, notes
    )
    SELECT 
      parent_id, 
      tenant_id, 
      'subtask_rollup', 
      'duration/due_date',
      NULL,
      jsonb_build_object('duration', total_duration, 'due_date', max_due_date),
      COALESCE(auth.uid(), created_by),
      'Auto-updated from subtask changes'
    FROM public.todos 
    WHERE id = parent_id;
  END IF;
  
  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create separate triggers for INSERT/UPDATE and DELETE
DROP TRIGGER IF EXISTS trigger_subtask_rollup_on_update ON public.todos;
DROP TRIGGER IF EXISTS trigger_subtask_rollup_on_insert_update ON public.todos;
DROP TRIGGER IF EXISTS trigger_subtask_rollup_on_delete ON public.todos;

-- Trigger for INSERT and UPDATE operations
CREATE TRIGGER trigger_subtask_rollup_on_insert_update
  AFTER INSERT OR UPDATE OF duration, due_date, deleted_at, parent_todo_id
  ON public.todos
  FOR EACH ROW
  WHEN (NEW.parent_todo_id IS NOT NULL)
  EXECUTE FUNCTION public.update_parent_todo_aggregates();

-- Trigger for DELETE operations  
CREATE TRIGGER trigger_subtask_rollup_on_delete
  AFTER DELETE
  ON public.todos
  FOR EACH ROW
  WHEN (OLD.parent_todo_id IS NOT NULL)
  EXECUTE FUNCTION public.update_parent_todo_aggregates();

-- 4. Add helpful comments
COMMENT ON COLUMN public.deals.company_id IS 'Direct link to company (Fluid Entity Model - replaces customer duplication)';
COMMENT ON COLUMN public.deals.contact_id IS 'Direct link to contact (Fluid Entity Model - replaces customer duplication)';
COMMENT ON COLUMN public.contracts.company_id IS 'Direct link to company (Fluid Entity Model - replaces customer duplication)';
COMMENT ON COLUMN public.contracts.contact_id IS 'Direct link to contact (Fluid Entity Model - replaces customer duplication)';
COMMENT ON FUNCTION public.update_parent_todo_aggregates() IS 'Auto-calculates parent todo duration and due_date from child todos';