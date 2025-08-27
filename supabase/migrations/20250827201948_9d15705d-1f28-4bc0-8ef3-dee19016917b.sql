-- Add missing foreign key constraints to company_sites table
ALTER TABLE company_sites 
ADD CONSTRAINT company_sites_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE company_sites 
ADD CONSTRAINT company_sites_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

-- Add missing foreign key constraints to contact_sites table if not exists
ALTER TABLE contact_sites 
ADD CONSTRAINT contact_sites_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE contact_sites 
ADD CONSTRAINT contact_sites_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;