-- AUDIT: Site as Master Anchor
-- Ensure site_id is present and indexed in deals, quotes, and projects

-- 1. Add index on deals.site_id (column exists, needs index)
CREATE INDEX IF NOT EXISTS idx_deals_site_id ON public.deals(site_id);

-- 2. Add direct site_id to projects table for primary site reference
-- (project_sites junction table remains for multi-site projects)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;

-- Create index for projects.site_id
CREATE INDEX IF NOT EXISTS idx_projects_site_id ON public.projects(site_id);

-- 3. Add index on project_sites.site_id for reverse lookups
CREATE INDEX IF NOT EXISTS idx_project_sites_site_id ON public.project_sites(site_id);

-- 4. Add comments explaining the site anchor pattern
COMMENT ON COLUMN public.deals.site_id IS 'Primary site for this deal - enables site-centric history queries';
COMMENT ON COLUMN public.projects.site_id IS 'Primary site for this project - enables site-centric history queries';
COMMENT ON COLUMN public.quotes.site_id IS 'Primary site for this quote - enables site-centric history queries';

-- 5. Create a view for unified site history (all entities linked to a site)
CREATE OR REPLACE VIEW public.site_history AS
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

-- Enable RLS on the view (views inherit from underlying tables)
-- Grant access to authenticated users
GRANT SELECT ON public.site_history TO authenticated;