-- Add Arabic description fields to device_templates table
ALTER TABLE device_templates 
ADD COLUMN short_description_ar_generation_type text DEFAULT 'dynamic',
ADD COLUMN short_description_ar_formula text,
ADD COLUMN description_ar_generation_type text DEFAULT 'dynamic', 
ADD COLUMN description_ar_formula text;