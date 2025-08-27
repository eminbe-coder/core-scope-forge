-- Create custom roles table for tenant-specific roles
CREATE TABLE public.custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for custom roles
CREATE POLICY "Tenant access for custom roles" 
ON public.custom_roles 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add trigger for updated_at
CREATE TRIGGER update_custom_roles_updated_at
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update user_tenant_memberships to support custom roles
ALTER TABLE public.user_tenant_memberships 
ADD COLUMN custom_role_id UUID REFERENCES public.custom_roles(id);

-- Create tenant pricing settings table
CREATE TABLE public.tenant_pricing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,
  default_currency_id UUID REFERENCES public.currencies(id),
  custom_conversion_rates JSONB DEFAULT '{}',
  pricing_tiers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_pricing_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant pricing settings
CREATE POLICY "Tenant access for pricing settings" 
ON public.tenant_pricing_settings 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add trigger for updated_at
CREATE TRIGGER update_tenant_pricing_settings_updated_at
BEFORE UPDATE ON public.tenant_pricing_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();