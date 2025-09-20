-- Create device template options table (independent from properties)
CREATE TABLE public.device_template_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES device_templates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  code TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_ar TEXT,
  unit TEXT,
  data_type TEXT NOT NULL DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'mixed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add multi-language and dynamic generation fields to device_templates
ALTER TABLE public.device_templates 
ADD COLUMN supports_multilang BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN sku_generation_type TEXT NOT NULL DEFAULT 'fixed' CHECK (sku_generation_type IN ('fixed', 'dynamic')),
ADD COLUMN sku_formula TEXT,
ADD COLUMN description_generation_type TEXT NOT NULL DEFAULT 'fixed' CHECK (description_generation_type IN ('fixed', 'dynamic')),
ADD COLUMN description_formula TEXT,
ADD COLUMN label_ar TEXT;

-- Add multi-language support to device_template_properties
ALTER TABLE public.device_template_properties
ADD COLUMN label_en TEXT,
ADD COLUMN label_ar TEXT;

-- Update existing properties to have label_en from name field
UPDATE public.device_template_properties 
SET label_en = name 
WHERE label_en IS NULL;

-- Make label_en required after migration
ALTER TABLE public.device_template_properties 
ALTER COLUMN label_en SET NOT NULL;

-- Expand property_type options
ALTER TABLE public.device_template_properties 
DROP CONSTRAINT IF EXISTS device_template_properties_property_type_check;

ALTER TABLE public.device_template_properties 
ADD CONSTRAINT device_template_properties_property_type_check 
CHECK (property_type IN ('text', 'number', 'select', 'multiselect', 'boolean', 'date', 'mixed'));

-- Enable RLS on device_template_options
ALTER TABLE public.device_template_options ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for device_template_options
CREATE POLICY "Global template options are viewable by everyone"
ON public.device_template_options 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM device_templates dt 
    WHERE dt.id = template_id AND dt.is_global = true
  )
);

CREATE POLICY "Tenant template options access"
ON public.device_template_options 
FOR ALL 
USING (
  (
    EXISTS (
      SELECT 1 FROM device_templates dt 
      WHERE dt.id = template_id 
      AND dt.is_global = false 
      AND user_has_tenant_access(auth.uid(), dt.tenant_id)
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM device_templates dt 
      WHERE dt.id = template_id 
      AND dt.is_global = true 
      AND is_super_admin(auth.uid())
    )
  )
)
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM device_templates dt 
      WHERE dt.id = template_id 
      AND dt.is_global = false 
      AND user_has_tenant_access(auth.uid(), dt.tenant_id)
    )
  ) OR (
    EXISTS (
      SELECT 1 FROM device_templates dt 
      WHERE dt.id = template_id 
      AND dt.is_global = true 
      AND is_super_admin(auth.uid())
    )
  )
);

-- Create indexes for better performance
CREATE INDEX idx_device_template_options_template_id ON public.device_template_options(template_id);
CREATE INDEX idx_device_template_options_tenant_id ON public.device_template_options(tenant_id);
CREATE INDEX idx_device_template_options_code ON public.device_template_options(template_id, code);

-- Create trigger for updated_at
CREATE TRIGGER update_device_template_options_updated_at
  BEFORE UPDATE ON public.device_template_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();