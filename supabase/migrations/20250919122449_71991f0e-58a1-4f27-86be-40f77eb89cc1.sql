-- Create reward point trigger functions and triggers

-- Trigger for completing todos
CREATE FUNCTION public.trigger_award_points_todo_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only award points when a todo is completed (status changed to completed)
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM public.award_points(
      NEW.completed_by, 
      NEW.tenant_id, 
      'complete_todo', 
      NEW.entity_type, 
      NEW.entity_id, 
      'Completed todo: ' || NEW.title
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_points_todo_completion
AFTER UPDATE ON public.todos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_award_points_todo_completion();

-- Trigger for creating deals
CREATE FUNCTION public.trigger_award_points_deal_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.award_points(
      auth.uid(), 
      NEW.tenant_id, 
      'create_deal', 
      'deal', 
      NEW.id, 
      'Created deal: ' || NEW.name
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_points_deal_creation
AFTER INSERT ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.trigger_award_points_deal_creation();

-- Trigger for creating contacts
CREATE FUNCTION public.trigger_award_points_contact_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.award_points(
      auth.uid(), 
      NEW.tenant_id, 
      'create_contact', 
      'contact', 
      NEW.id, 
      'Created contact: ' || COALESCE(NEW.first_name || ' ' || NEW.last_name, 'Unknown')
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_points_contact_creation
AFTER INSERT ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_award_points_contact_creation();

-- Trigger for creating companies
CREATE FUNCTION public.trigger_award_points_company_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.award_points(
      auth.uid(), 
      NEW.tenant_id, 
      'create_company', 
      'company', 
      NEW.id, 
      'Created company: ' || NEW.name
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_points_company_creation
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.trigger_award_points_company_creation();

-- Trigger for deal stage changes
CREATE FUNCTION public.trigger_award_points_deal_stage_move()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award points when deal stage changes
  IF TG_OP = 'UPDATE' AND (OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    PERFORM public.award_points(
      auth.uid(), 
      NEW.tenant_id, 
      'move_deal_stage', 
      'deal', 
      NEW.id, 
      'Moved deal stage: ' || NEW.name
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_points_deal_stage_move
AFTER UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.trigger_award_points_deal_stage_move();

-- Trigger for contract conversion
CREATE FUNCTION public.trigger_award_points_contract_conversion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deal_id IS NOT NULL THEN
    PERFORM public.award_points(
      auth.uid(), 
      NEW.tenant_id, 
      'convert_deal_to_contract', 
      'contract', 
      NEW.id, 
      'Converted deal to contract: ' || NEW.name
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_points_contract_conversion
AFTER INSERT ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_award_points_contract_conversion();

-- Trigger for adding site relations
CREATE FUNCTION public.trigger_award_points_site_relation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_id_val UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get tenant_id from the site
    SELECT tenant_id INTO tenant_id_val
    FROM public.sites
    WHERE id = NEW.site_id;
    
    IF tenant_id_val IS NOT NULL THEN
      PERFORM public.award_points(
        auth.uid(), 
        tenant_id_val, 
        'add_site_relation', 
        'site', 
        NEW.site_id, 
        'Added site relation'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER award_points_company_site_relation
AFTER INSERT ON public.company_sites
FOR EACH ROW
EXECUTE FUNCTION public.trigger_award_points_site_relation();

CREATE TRIGGER award_points_contact_site_relation
AFTER INSERT ON public.contact_sites
FOR EACH ROW
EXECUTE FUNCTION public.trigger_award_points_site_relation();