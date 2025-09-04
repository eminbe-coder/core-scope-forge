-- Add source fields to deals table for specific entity sources
ALTER TABLE deals ADD COLUMN source_company_id UUID REFERENCES companies(id);
ALTER TABLE deals ADD COLUMN source_contact_id UUID REFERENCES contacts(id);
ALTER TABLE deals ADD COLUMN source_user_id UUID REFERENCES profiles(id);

-- Add source fields to companies table (for leads)
ALTER TABLE companies ADD COLUMN source_company_id UUID REFERENCES companies(id);
ALTER TABLE companies ADD COLUMN source_contact_id UUID REFERENCES contacts(id);
ALTER TABLE companies ADD COLUMN source_user_id UUID REFERENCES profiles(id);

-- Add source fields to contacts table (for leads)  
ALTER TABLE contacts ADD COLUMN source_company_id UUID REFERENCES companies(id);
ALTER TABLE contacts ADD COLUMN source_contact_id UUID REFERENCES contacts(id);
ALTER TABLE contacts ADD COLUMN source_user_id UUID REFERENCES profiles(id);

-- Add source category to companies and contacts for leads
ALTER TABLE companies ADD COLUMN source_id UUID REFERENCES deal_sources(id);
ALTER TABLE contacts ADD COLUMN source_id UUID REFERENCES deal_sources(id);