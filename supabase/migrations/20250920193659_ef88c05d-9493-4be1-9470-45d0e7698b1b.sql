-- Add cost modifier fields to device template options
ALTER TABLE device_template_options 
ADD COLUMN cost_modifier NUMERIC DEFAULT 0,
ADD COLUMN cost_modifier_type TEXT DEFAULT 'fixed' CHECK (cost_modifier_type IN ('fixed', 'percentage')),
ADD COLUMN cost_currency_id UUID REFERENCES currencies(id);