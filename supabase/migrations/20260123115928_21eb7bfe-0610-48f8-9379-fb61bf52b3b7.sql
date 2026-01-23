-- Create quotes table for proposals before a project is won
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
  total_amount NUMERIC(15,2) DEFAULT 0,
  currency_id UUID REFERENCES public.currencies(id),
  expiry_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES public.profiles(id)
);

-- Create quote_versions table for "Option A vs Option B" support
CREATE TABLE public.quote_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_name TEXT NOT NULL DEFAULT 'Version 1',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  total_amount NUMERIC(15,2) DEFAULT 0,
  margin_percentage NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quote_id, version_number)
);

-- Create quote_items table for line items in each version
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  quote_version_id UUID NOT NULL REFERENCES public.quote_versions(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  margin_percentage NUMERIC(5,2) DEFAULT 0,
  total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  total_price NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
CREATE POLICY "Users can view quotes in their tenant"
  ON public.quotes FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create quotes in their tenant"
  ON public.quotes FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Users can update quotes in their tenant"
  ON public.quotes FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Users can delete quotes in their tenant"
  ON public.quotes FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- RLS Policies for quote_versions
CREATE POLICY "Users can view quote versions in their tenant"
  ON public.quote_versions FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Users can create quote versions in their tenant"
  ON public.quote_versions FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Users can update quote versions in their tenant"
  ON public.quote_versions FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Users can delete quote versions in their tenant"
  ON public.quote_versions FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- RLS Policies for quote_items
CREATE POLICY "Users can view quote items in their tenant"
  ON public.quote_items FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Users can create quote items in their tenant"
  ON public.quote_items FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Users can update quote items in their tenant"
  ON public.quote_items FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Users can delete quote items in their tenant"
  ON public.quote_items FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_memberships
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Indexes for performance
CREATE INDEX idx_quotes_tenant_id ON public.quotes(tenant_id);
CREATE INDEX idx_quotes_deal_id ON public.quotes(deal_id);
CREATE INDEX idx_quotes_site_id ON public.quotes(site_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_deleted_at ON public.quotes(deleted_at);
CREATE INDEX idx_quote_versions_quote_id ON public.quote_versions(quote_id);
CREATE INDEX idx_quote_items_version_id ON public.quote_items(quote_version_id);
CREATE INDEX idx_quote_items_device_id ON public.quote_items(device_id);

-- Triggers for updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_versions_updated_at
  BEFORE UPDATE ON public.quote_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_items_updated_at
  BEFORE UPDATE ON public.quote_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to convert approved quote to project devices
CREATE OR REPLACE FUNCTION public.convert_quote_to_project(
  _quote_id UUID,
  _project_id UUID,
  _version_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _version_to_use UUID;
  _tenant_id UUID;
BEGIN
  -- Get tenant_id from quote
  SELECT tenant_id INTO _tenant_id FROM quotes WHERE id = _quote_id;
  
  -- If no version specified, use the primary version
  IF _version_id IS NULL THEN
    SELECT id INTO _version_to_use
    FROM quote_versions
    WHERE quote_id = _quote_id AND is_primary = true
    LIMIT 1;
  ELSE
    _version_to_use := _version_id;
  END IF;
  
  -- If still no version, use the first one
  IF _version_to_use IS NULL THEN
    SELECT id INTO _version_to_use
    FROM quote_versions
    WHERE quote_id = _quote_id
    ORDER BY version_number ASC
    LIMIT 1;
  END IF;
  
  -- Copy quote items to project devices
  INSERT INTO project_devices (
    project_id, device_id, quantity, unit_price, notes, tenant_id
  )
  SELECT 
    _project_id,
    qi.device_id,
    qi.quantity,
    qi.unit_price,
    qi.notes,
    _tenant_id
  FROM quote_items qi
  WHERE qi.quote_version_id = _version_to_use
    AND qi.device_id IS NOT NULL;
  
  -- Update quote status to approved
  UPDATE quotes SET status = 'approved', updated_at = now() WHERE id = _quote_id;
END;
$$;

-- Function to update quote version totals
CREATE OR REPLACE FUNCTION public.update_quote_version_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _version_total NUMERIC(15,2);
  _quote_id UUID;
BEGIN
  -- Get the version total
  SELECT COALESCE(SUM(quantity * unit_price), 0) INTO _version_total
  FROM quote_items
  WHERE quote_version_id = COALESCE(NEW.quote_version_id, OLD.quote_version_id);
  
  -- Update version total
  UPDATE quote_versions
  SET total_amount = _version_total, updated_at = now()
  WHERE id = COALESCE(NEW.quote_version_id, OLD.quote_version_id)
  RETURNING quote_id INTO _quote_id;
  
  -- Update quote total from primary version (or first version if no primary)
  UPDATE quotes q
  SET total_amount = COALESCE(
    (SELECT total_amount FROM quote_versions WHERE quote_id = _quote_id AND is_primary = true LIMIT 1),
    (SELECT total_amount FROM quote_versions WHERE quote_id = _quote_id ORDER BY version_number ASC LIMIT 1),
    0
  ),
  updated_at = now()
  WHERE id = _quote_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update totals when items change
CREATE TRIGGER update_quote_totals_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quote_version_totals();