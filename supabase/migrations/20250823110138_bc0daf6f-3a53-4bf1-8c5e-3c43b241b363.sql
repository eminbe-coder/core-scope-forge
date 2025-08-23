-- Multi-tenant SaaS CRM and Project Management System
-- Core system tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- App roles enum for tenant membership
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');

-- Customer types enum
CREATE TYPE public.customer_type AS ENUM ('individual', 'company');

-- Project types enum
CREATE TYPE public.project_type AS ENUM ('BOQ', 'lighting_calculation', 'general');

-- Activity types enum
CREATE TYPE public.activity_type AS ENUM ('call', 'email', 'meeting', 'task', 'note');

-- Deal status enum
CREATE TYPE public.deal_status AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

-- Project status enum
CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');

-- TENANTS TABLE
CREATE TABLE public.tenants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    domain TEXT,
    settings JSONB DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- USER PROFILES TABLE
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- USER TENANT MEMBERSHIPS TABLE
CREATE TABLE public.user_tenant_memberships (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'member',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

-- PERMISSIONS TABLE
CREATE TABLE public.permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    module TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ROLE PERMISSIONS TABLE
CREATE TABLE public.role_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, role, permission_id)
);

-- CURRENCIES TABLE
CREATE TABLE public.currencies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CATEGORIES TABLE
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    module TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name, module)
);

-- CUSTOMERS TABLE
CREATE TABLE public.customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type customer_type NOT NULL DEFAULT 'company',
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    website TEXT,
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SITES TABLE
CREATE TABLE public.sites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CONTACTS TABLE
CREATE TABLE public.contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CONTACT SITES JUNCTION TABLE
CREATE TABLE public.contact_sites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(contact_id, site_id)
);

-- DEALS TABLE
CREATE TABLE public.deals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    value DECIMAL(15, 2),
    currency_id UUID REFERENCES public.currencies(id),
    status deal_status NOT NULL DEFAULT 'lead',
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    assigned_to UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PROJECTS TABLE
CREATE TABLE public.projects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    type project_type NOT NULL DEFAULT 'general',
    status project_status NOT NULL DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2),
    currency_id UUID REFERENCES public.currencies(id),
    assigned_to UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PROJECT SITES JUNCTION TABLE
CREATE TABLE public.project_sites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, site_id)
);

-- PROJECT FLOORS TABLE
CREATE TABLE public.project_floors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER,
    area DECIMAL(10, 2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM ACTIVITIES TABLE
CREATE TABLE public.activities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type activity_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id),
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- USER ACTION LOGS TABLE
CREATE TABLE public.user_action_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_action_logs ENABLE ROW LEVEL SECURITY;

-- Create function to check user role in tenant
CREATE OR REPLACE FUNCTION public.has_role_in_tenant(_user_id UUID, _tenant_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenant_memberships
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
      AND active = true
  );
$$;

-- Create function to get user's current tenant
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('app.current_tenant_id', true)::UUID,
    NULL
  );
$$;

-- Create function to check if user has access to tenant
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenant_memberships
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND active = true
  );
$$;

-- RLS POLICIES

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Tenants policies
CREATE POLICY "Users can view tenants they belong to"
ON public.tenants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = tenants.id
      AND active = true
  )
);

-- User tenant memberships policies
CREATE POLICY "Users can view their own memberships"
ON public.user_tenant_memberships
FOR SELECT
USING (user_id = auth.uid());

-- Multi-tenant table policies (customers, sites, contacts, deals, projects, activities)
CREATE POLICY "Tenant access for customers"
ON public.customers
FOR ALL
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Tenant access for sites"
ON public.sites
FOR ALL
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Tenant access for contacts"
ON public.contacts
FOR ALL
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Tenant access for deals"
ON public.deals
FOR ALL
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Tenant access for projects"
ON public.projects
FOR ALL
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Tenant access for activities"
ON public.activities
FOR ALL
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Tenant access for categories"
ON public.categories
FOR ALL
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND tenant_id = public.get_current_tenant_id()
);

CREATE POLICY "Tenant access for user action logs"
ON public.user_action_logs
FOR ALL
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND tenant_id = public.get_current_tenant_id()
);

-- Junction table policies
CREATE POLICY "Tenant access for contact sites"
ON public.contact_sites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.contacts
    WHERE contacts.id = contact_sites.contact_id
      AND public.user_has_tenant_access(auth.uid(), contacts.tenant_id)
      AND contacts.tenant_id = public.get_current_tenant_id()
  )
);

CREATE POLICY "Tenant access for project sites"
ON public.project_sites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_sites.project_id
      AND public.user_has_tenant_access(auth.uid(), projects.tenant_id)
      AND projects.tenant_id = public.get_current_tenant_id()
  )
);

CREATE POLICY "Tenant access for project floors"
ON public.project_floors
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = project_floors.project_id
      AND public.user_has_tenant_access(auth.uid(), projects.tenant_id)
      AND projects.tenant_id = public.get_current_tenant_id()
  )
);

-- Currencies and permissions can be read by authenticated users
CREATE POLICY "Authenticated users can view currencies"
ON public.currencies
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view permissions"
ON public.permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Tenant access for role permissions"
ON public.role_permissions
FOR ALL
USING (
  public.user_has_tenant_access(auth.uid(), tenant_id)
  AND tenant_id = public.get_current_tenant_id()
);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_tenant_memberships_updated_at
  BEFORE UPDATE ON public.user_tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_floors_updated_at
  BEFORE UPDATE ON public.project_floors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default currencies
INSERT INTO public.currencies (code, name, symbol) VALUES
('USD', 'US Dollar', '$'),
('EUR', 'Euro', '€'),
('GBP', 'British Pound', '£'),
('CAD', 'Canadian Dollar', 'C$'),
('AUD', 'Australian Dollar', 'A$');

-- Insert default permissions
INSERT INTO public.permissions (name, description, module) VALUES
-- CRM permissions
('crm.customers.view', 'View customers', 'CRM'),
('crm.customers.create', 'Create customers', 'CRM'),
('crm.customers.edit', 'Edit customers', 'CRM'),
('crm.customers.delete', 'Delete customers', 'CRM'),
('crm.sites.view', 'View sites', 'CRM'),
('crm.sites.create', 'Create sites', 'CRM'),
('crm.sites.edit', 'Edit sites', 'CRM'),
('crm.sites.delete', 'Delete sites', 'CRM'),
('crm.contacts.view', 'View contacts', 'CRM'),
('crm.contacts.create', 'Create contacts', 'CRM'),
('crm.contacts.edit', 'Edit contacts', 'CRM'),
('crm.contacts.delete', 'Delete contacts', 'CRM'),
('crm.deals.view', 'View deals', 'CRM'),
('crm.deals.create', 'Create deals', 'CRM'),
('crm.deals.edit', 'Edit deals', 'CRM'),
('crm.deals.delete', 'Delete deals', 'CRM'),
('crm.activities.view', 'View activities', 'CRM'),
('crm.activities.create', 'Create activities', 'CRM'),
('crm.activities.edit', 'Edit activities', 'CRM'),
('crm.activities.delete', 'Delete activities', 'CRM'),
-- Projects permissions
('projects.view', 'View projects', 'Projects'),
('projects.create', 'Create projects', 'Projects'),
('projects.edit', 'Edit projects', 'Projects'),
('projects.delete', 'Delete projects', 'Projects'),
-- Admin permissions
('admin.tenants.manage', 'Manage tenant settings', 'Admin'),
('admin.users.manage', 'Manage users and roles', 'Admin'),
('admin.permissions.manage', 'Manage permissions', 'Admin');