-- Fix security definer view by recreating with security_invoker = true
DROP VIEW IF EXISTS public.site_history;

CREATE VIEW public.site_history 
WITH (security_invoker = true)
AS
SELECT 
  s.id as site_id,
  s.name as site_name,
  s.tenant_id,
  'deal' as entity_type,
  d.id as entity_id,
  d.name as entity_name,
  d.created_at,
  d.value as amount,
  ds.name as status
FROM public.sites s
LEFT JOIN public.deals d ON d.site_id = s.id AND d.deleted_at IS NULL
LEFT JOIN public.deal_statuses ds ON d.deal_status_id = ds.id
WHERE d.id IS NOT NULL

UNION ALL

SELECT 
  s.id as site_id,
  s.name as site_name,
  s.tenant_id,
  'quote' as entity_type,
  q.id as entity_id,
  q.name as entity_name,
  q.created_at,
  q.total_amount as amount,
  q.status
FROM public.sites s
LEFT JOIN public.quotes q ON q.site_id = s.id AND q.deleted_at IS NULL
WHERE q.id IS NOT NULL

UNION ALL

SELECT 
  s.id as site_id,
  s.name as site_name,
  s.tenant_id,
  'project' as entity_type,
  p.id as entity_id,
  p.name as entity_name,
  p.created_at,
  p.budget as amount,
  p.status::text
FROM public.sites s
LEFT JOIN public.projects p ON p.site_id = s.id
WHERE p.id IS NOT NULL

UNION ALL

SELECT 
  s.id as site_id,
  s.name as site_name,
  s.tenant_id,
  'contract' as entity_type,
  c.id as entity_id,
  c.name as entity_name,
  c.created_at,
  c.value as amount,
  c.status
FROM public.sites s
LEFT JOIN public.contracts c ON c.site_id = s.id AND c.deleted_at IS NULL
WHERE c.id IS NOT NULL;

GRANT SELECT ON public.site_history TO authenticated;