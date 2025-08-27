-- Add GCC currencies to the currencies table
INSERT INTO public.currencies (code, name, symbol) VALUES
('AED', 'UAE Dirham', 'د.إ'),
('SAR', 'Saudi Riyal', 'ر.س'),
('BHD', 'Bahraini Dinar', 'ب.د'),
('KWD', 'Kuwaiti Dinar', 'د.ك'),
('QAR', 'Qatari Riyal', 'ر.ق'),
('OMR', 'Omani Rial', 'ر.ع.')
ON CONFLICT (code) DO NOTHING;

-- Create currency_settings table for tenant-specific conversion rates
CREATE TABLE public.currency_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  from_currency_id UUID NOT NULL,
  to_currency_id UUID NOT NULL,
  conversion_rate NUMERIC(10, 6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, from_currency_id, to_currency_id)
);

-- Enable Row Level Security
ALTER TABLE public.currency_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant access
CREATE POLICY "Tenant access for currency settings" 
ON public.currency_settings 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add foreign key constraints
ALTER TABLE public.currency_settings 
ADD CONSTRAINT fk_currency_settings_tenant 
FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.currency_settings 
ADD CONSTRAINT fk_currency_settings_from_currency 
FOREIGN KEY (from_currency_id) REFERENCES public.currencies(id);

ALTER TABLE public.currency_settings 
ADD CONSTRAINT fk_currency_settings_to_currency 
FOREIGN KEY (to_currency_id) REFERENCES public.currencies(id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_currency_settings_updated_at
BEFORE UPDATE ON public.currency_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();