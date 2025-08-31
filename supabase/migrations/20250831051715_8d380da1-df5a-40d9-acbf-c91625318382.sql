-- Add high_value field support to report widgets and global widgets table
CREATE TABLE IF NOT EXISTS report_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  widget_type TEXT NOT NULL DEFAULT 'report',
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on report_widgets
ALTER TABLE report_widgets ENABLE ROW LEVEL SECURITY;

-- Create policies for report_widgets
CREATE POLICY "Tenant access for report widgets"
ON report_widgets
FOR ALL
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Super admin can view global widgets from all tenants
CREATE POLICY "Super admin can view all global widgets"
ON report_widgets
FOR SELECT
USING (is_global = true AND is_super_admin(auth.uid()));

-- Add is_global field to user_dashboard_configs for global widgets
ALTER TABLE user_dashboard_configs 
ADD COLUMN IF NOT EXISTS report_widget_id UUID REFERENCES report_widgets(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;