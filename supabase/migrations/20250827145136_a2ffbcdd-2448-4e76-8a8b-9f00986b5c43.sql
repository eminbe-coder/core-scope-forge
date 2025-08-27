-- Add document library selection to OneDrive settings
ALTER TABLE tenant_onedrive_settings 
ADD COLUMN selected_library_id text,
ADD COLUMN selected_library_name text;