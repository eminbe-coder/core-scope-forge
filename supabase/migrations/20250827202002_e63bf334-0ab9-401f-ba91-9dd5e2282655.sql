-- Add missing foreign key constraints to company_sites table only
ALTER TABLE company_sites 
ADD CONSTRAINT company_sites_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE company_sites 
ADD CONSTRAINT company_sites_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;