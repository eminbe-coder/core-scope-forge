-- Step 1: Create device templates system tables

-- Create device templates table for global and tenant-specific templates
CREATE TABLE public.device_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  properties_schema JSONB NOT NULL DEFAULT '{}',
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create device template properties table for structured property definitions
CREATE TABLE public.device_template_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.device_templates(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('text', 'number', 'boolean', 'select', 'textarea', 'color', 'file')),
  property_options JSONB DEFAULT '[]', -- For select type options
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, property_name)
);

-- Add template_id and is_global columns to existing devices table
ALTER TABLE public.devices 
ADD COLUMN template_id UUID REFERENCES public.device_templates(id),
ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN template_properties JSONB DEFAULT '{}';

-- Create global_users table for non-tenant users (customers/professionals)
CREATE TABLE public.global_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'professional')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  verification_token TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create global user tenant relationships table
CREATE TABLE public.global_user_tenant_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  global_user_id UUID NOT NULL REFERENCES public.global_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('customer', 'vendor', 'partner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(global_user_id, tenant_id, relationship_type)
);

-- Enable RLS on new tables
ALTER TABLE public.device_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_template_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_user_tenant_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_templates
CREATE POLICY "Super admins can manage all device templates" 
ON public.device_templates 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Tenant users can view global and their own templates" 
ON public.device_templates 
FOR SELECT 
USING (is_global = true OR user_has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant users can manage their own templates" 
ON public.device_templates 
FOR ALL 
USING (user_has_tenant_access(auth.uid(), tenant_id) AND is_global = false);

-- RLS Policies for device_template_properties
CREATE POLICY "Template properties inherit template access" 
ON public.device_template_properties 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.device_templates dt 
    WHERE dt.id = device_template_properties.template_id 
    AND (is_super_admin(auth.uid()) OR dt.is_global = true OR user_has_tenant_access(auth.uid(), dt.tenant_id))
  )
);

-- RLS Policies for global_users
CREATE POLICY "Super admins can manage all global users" 
ON public.global_users 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Global users can view their own profile" 
ON public.global_users 
FOR SELECT 
USING (auth.uid()::text = id::text);

-- RLS Policies for global_user_tenant_relationships
CREATE POLICY "Super admins can manage all global user relationships" 
ON public.global_user_tenant_relationships 
FOR ALL 
USING (is_super_admin(auth.uid()));

CREATE POLICY "Tenant users can view relationships with their tenant" 
ON public.global_user_tenant_relationships 
FOR SELECT 
USING (user_has_tenant_access(auth.uid(), tenant_id));

-- Create updated_at triggers
CREATE TRIGGER update_device_templates_updated_at
  BEFORE UPDATE ON public.device_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_device_template_properties_updated_at
  BEFORE UPDATE ON public.device_template_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_users_updated_at
  BEFORE UPDATE ON public.global_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_user_tenant_relationships_updated_at
  BEFORE UPDATE ON public.global_user_tenant_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_device_templates_tenant_id ON public.device_templates(tenant_id);
CREATE INDEX idx_device_templates_category ON public.device_templates(category);
CREATE INDEX idx_device_templates_is_global ON public.device_templates(is_global);
CREATE INDEX idx_device_template_properties_template_id ON public.device_template_properties(template_id);
CREATE INDEX idx_devices_template_id ON public.devices(template_id);
CREATE INDEX idx_global_users_email ON public.global_users(email);
CREATE INDEX idx_global_users_status ON public.global_users(status);
CREATE INDEX idx_global_user_tenant_relationships_global_user_id ON public.global_user_tenant_relationships(global_user_id);
CREATE INDEX idx_global_user_tenant_relationships_tenant_id ON public.global_user_tenant_relationships(tenant_id);