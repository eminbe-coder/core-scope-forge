-- Create reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  data_source TEXT NOT NULL,
  query_config JSONB NOT NULL DEFAULT '{}',
  visualization_type TEXT NOT NULL DEFAULT 'table',
  visibility TEXT NOT NULL DEFAULT 'private',
  tenant_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policies for reports
CREATE POLICY "Tenant access for reports"
ON reports
FOR ALL
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Add foreign key constraint to report_widgets
ALTER TABLE report_widgets 
ADD CONSTRAINT fk_report_widgets_reports 
FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE;

-- Add trigger for updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();