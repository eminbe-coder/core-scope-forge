-- Create global brands table (super admin only)
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Brands are viewable by everyone but only manageable by super admins
CREATE POLICY "Everyone can view active brands" 
ON public.brands 
FOR SELECT 
USING (active = true);

CREATE POLICY "Super admins can manage brands" 
ON public.brands 
FOR ALL 
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Add brand_id to device_templates
ALTER TABLE public.device_templates 
ADD COLUMN brand_id UUID REFERENCES public.brands(id);

-- Add pricing fields to devices table
ALTER TABLE public.devices 
ADD COLUMN cost_price NUMERIC,
ADD COLUMN cost_currency_id UUID REFERENCES public.currencies(id),
ADD COLUMN msrp NUMERIC,
ADD COLUMN msrp_currency_id UUID REFERENCES public.currencies(id),
ADD COLUMN pricing_formula TEXT,
ADD COLUMN pricing_type TEXT DEFAULT 'manual' CHECK (pricing_type IN ('manual', 'formula'));

-- Create trigger for updating brands updated_at
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample brands for testing
INSERT INTO public.brands (name, description) VALUES 
('Samsung', 'South Korean electronics manufacturer'),
('Apple', 'American technology company'),
('Huawei', 'Chinese telecommunications equipment company'),
('Xiaomi', 'Chinese electronics company'),
('OnePlus', 'Chinese smartphone manufacturer');