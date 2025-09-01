-- Create tenant invitations table
CREATE TABLE public.tenant_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  email TEXT NOT NULL,
  role app_role NOT NULL,
  custom_role_id UUID REFERENCES public.custom_roles(id),
  invited_by UUID NOT NULL,
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, email, accepted_at) -- Allow re-inviting if not accepted
);

-- Enable RLS
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenant admins can manage invitations"
ON public.tenant_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_tenant_memberships
    WHERE user_id = auth.uid() 
    AND tenant_id = tenant_invitations.tenant_id
    AND role IN ('admin', 'super_admin')
    AND active = true
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_tenant_invitations_updated_at
BEFORE UPDATE ON public.tenant_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_tenant_invitations_token ON public.tenant_invitations(invitation_token);
CREATE INDEX idx_tenant_invitations_email ON public.tenant_invitations(email);
CREATE INDEX idx_tenant_invitations_tenant ON public.tenant_invitations(tenant_id);