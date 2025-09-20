-- Add property_options field to device_template_properties for multi-select options
ALTER TABLE device_template_properties 
ADD COLUMN property_options JSONB DEFAULT '[]'::jsonb;

-- Add comment to clarify the field usage
COMMENT ON COLUMN device_template_properties.property_options IS 'Array of options for select/multiselect properties: [{code: "RED", label_en: "Red", label_ar: "أحمر"}, ...]';

-- Add draft templates table for auto-save functionality
CREATE TABLE device_template_drafts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    template_id UUID NULL, -- NULL for new templates, UUID for editing existing
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on drafts table
ALTER TABLE device_template_drafts ENABLE ROW LEVEL SECURITY;

-- Create policy for drafts access
CREATE POLICY "Users can manage their own template drafts"
    ON device_template_drafts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_device_template_drafts_updated_at
    BEFORE UPDATE ON device_template_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();