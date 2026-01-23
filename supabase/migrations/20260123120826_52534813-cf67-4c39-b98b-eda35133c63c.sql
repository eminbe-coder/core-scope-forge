-- Add price_rules JSONB column for pricing logic (minimum advertised price, volume discounts, etc.)
ALTER TABLE public.devices
ADD COLUMN IF NOT EXISTS price_rules JSONB DEFAULT '{}';

-- Add vendor_id column pointing to companies table for supplier ownership
ALTER TABLE public.devices
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Create index for vendor lookups
CREATE INDEX IF NOT EXISTS idx_devices_vendor_id ON public.devices(vendor_id);

-- Create function to validate device specifications against template schema
CREATE OR REPLACE FUNCTION public.validate_device_specifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  template_props JSONB;
  prop RECORD;
  spec_value JSONB;
  prop_name TEXT;
  prop_type TEXT;
  prop_required BOOLEAN;
BEGIN
  -- Skip validation if no template is assigned
  IF NEW.template_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get template properties
  SELECT properties INTO template_props
  FROM device_templates
  WHERE id = NEW.template_id;
  
  -- Skip if template has no properties defined
  IF template_props IS NULL OR jsonb_array_length(template_props) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Validate each required property exists in specifications
  FOR prop IN SELECT * FROM jsonb_array_elements(template_props) AS p
  LOOP
    prop_name := prop.p->>'name';
    prop_type := prop.p->>'type';
    prop_required := COALESCE((prop.p->>'required')::boolean, false);
    
    -- Check if required property exists
    IF prop_required AND (NEW.specifications IS NULL OR NOT NEW.specifications ? prop_name) THEN
      RAISE EXCEPTION 'Missing required specification: %', prop_name;
    END IF;
    
    -- Basic type validation if property exists
    IF NEW.specifications ? prop_name THEN
      spec_value := NEW.specifications->prop_name;
      
      -- Validate number type
      IF prop_type = 'number' AND spec_value IS NOT NULL THEN
        IF jsonb_typeof(spec_value) NOT IN ('number', 'null') THEN
          RAISE EXCEPTION 'Specification "%" must be a number', prop_name;
        END IF;
      END IF;
      
      -- Validate boolean type
      IF prop_type = 'boolean' AND spec_value IS NOT NULL THEN
        IF jsonb_typeof(spec_value) NOT IN ('boolean', 'null') THEN
          RAISE EXCEPTION 'Specification "%" must be a boolean', prop_name;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for specification validation
DROP TRIGGER IF EXISTS validate_device_specs_trigger ON public.devices;
CREATE TRIGGER validate_device_specs_trigger
  BEFORE INSERT OR UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_device_specifications();

-- Add comment explaining price_rules structure
COMMENT ON COLUMN public.devices.price_rules IS 'JSON structure for pricing rules: { "min_advertised_price": number, "volume_discounts": [{ "min_qty": number, "discount_pct": number }], "margin_floor": number }';

-- Add comment explaining vendor relationship
COMMENT ON COLUMN public.devices.vendor_id IS 'References companies table - the supplier/vendor that owns or provides this device';