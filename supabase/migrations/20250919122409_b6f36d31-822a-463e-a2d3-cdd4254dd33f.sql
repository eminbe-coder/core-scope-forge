-- Drop all existing reward-related triggers and functions
DROP TRIGGER IF EXISTS award_points_todo_completion ON public.todos;
DROP TRIGGER IF EXISTS award_points_deal_creation ON public.deals;
DROP TRIGGER IF EXISTS award_points_contact_creation ON public.contacts;
DROP TRIGGER IF EXISTS award_points_company_creation ON public.companies;
DROP TRIGGER IF EXISTS award_points_deal_stage_move ON public.deals;
DROP TRIGGER IF EXISTS award_points_contract_conversion ON public.contracts;
DROP TRIGGER IF EXISTS award_points_company_site_relation ON public.company_sites;
DROP TRIGGER IF EXISTS award_points_contact_site_relation ON public.contact_sites;

DROP FUNCTION IF EXISTS public.trigger_award_points_todo_completion();
DROP FUNCTION IF EXISTS public.trigger_award_points_deal_creation();
DROP FUNCTION IF EXISTS public.trigger_award_points_contact_creation();
DROP FUNCTION IF EXISTS public.trigger_award_points_company_creation();
DROP FUNCTION IF EXISTS public.trigger_award_points_deal_stage_move();
DROP FUNCTION IF EXISTS public.trigger_award_points_contract_conversion();
DROP FUNCTION IF EXISTS public.trigger_award_points_site_relation();