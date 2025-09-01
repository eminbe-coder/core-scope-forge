-- Create task types table for tenant-level configuration
CREATE TABLE public.task_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Tenant access for task types"
ON public.task_types
FOR ALL
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- Create updated_at trigger
CREATE TRIGGER update_task_types_updated_at
  BEFORE UPDATE ON public.task_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default task types for existing tenants
INSERT INTO public.task_types (tenant_id, name, description, color, sort_order)
SELECT 
  t.id as tenant_id,
  task_type.name,
  task_type.description,
  task_type.color,
  task_type.sort_order
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('Task', 'General task or action item', '#3b82f6', 1),
    ('Call', 'Phone call or video call', '#10b981', 2),
    ('Meeting', 'In-person or virtual meeting', '#f59e0b', 3),
    ('Email', 'Email communication', '#ef4444', 4),
    ('Site Visit', 'Physical site inspection or visit', '#8b5cf6', 5),
    ('Create Estimate', 'Prepare cost estimate or quote', '#06b6d4', 6),
    ('Modify Quantities', 'Update project quantities or specifications', '#84cc16', 7)
) AS task_type(name, description, color, sort_order)
WHERE t.active = true;