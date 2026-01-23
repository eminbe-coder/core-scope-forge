-- Create deal_status_history table to track all status changes with reasons
CREATE TABLE public.deal_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    old_status_id UUID REFERENCES public.deal_statuses(id) ON DELETE SET NULL,
    new_status_id UUID REFERENCES public.deal_statuses(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    resume_date TIMESTAMP WITH TIME ZONE,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add status_resume_date column to deals table
ALTER TABLE public.deals ADD COLUMN status_resume_date TIMESTAMP WITH TIME ZONE;

-- Add requires_reason and is_pause_status columns to deal_statuses table
ALTER TABLE public.deal_statuses ADD COLUMN requires_reason BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.deal_statuses ADD COLUMN is_pause_status BOOLEAN NOT NULL DEFAULT false;

-- Enable Row Level Security
ALTER TABLE public.deal_status_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deal_status_history
CREATE POLICY "Users can view deal status history for their tenant"
ON public.deal_status_history
FOR SELECT
USING (tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
));

CREATE POLICY "Users can insert deal status history for their tenant"
ON public.deal_status_history
FOR INSERT
WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_tenant_memberships WHERE user_id = auth.uid()
));

-- Create index for faster queries
CREATE INDEX idx_deal_status_history_deal_id ON public.deal_status_history(deal_id);
CREATE INDEX idx_deal_status_history_tenant_id ON public.deal_status_history(tenant_id);
CREATE INDEX idx_deals_status_resume_date ON public.deals(status_resume_date) WHERE status_resume_date IS NOT NULL;