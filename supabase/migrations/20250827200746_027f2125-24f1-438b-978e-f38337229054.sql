-- Add notes column to contact_sites table for relationship descriptions
ALTER TABLE contact_sites ADD COLUMN notes TEXT;

-- Create company_sites junction table for company-site relationships with notes
CREATE TABLE company_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  site_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, site_id)
);

-- Enable RLS on company_sites
ALTER TABLE company_sites ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for company_sites
CREATE POLICY "Tenant access for company sites" 
ON company_sites 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM sites 
    WHERE sites.id = company_sites.site_id 
    AND user_has_tenant_access(auth.uid(), sites.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sites 
    WHERE sites.id = company_sites.site_id 
    AND user_has_tenant_access(auth.uid(), sites.tenant_id)
  )
);