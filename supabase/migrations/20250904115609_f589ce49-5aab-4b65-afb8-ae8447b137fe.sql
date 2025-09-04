-- Add default_lead_quality_id to tenants table
ALTER TABLE tenants ADD COLUMN default_lead_quality_id UUID REFERENCES lead_quality(id);