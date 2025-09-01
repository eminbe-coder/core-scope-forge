-- Update RLS policy on profiles to allow all tenant members to view each other
-- This will allow users to see other users in their tenant for task assignment

DROP POLICY IF EXISTS "Tenant admins can view user profiles" ON public.profiles;

-- Create a new policy that allows all tenant members to see each other
CREATE POLICY "Tenant members can view profiles in same tenant" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) OR 
  (EXISTS (
    SELECT 1 
    FROM user_tenant_memberships utm_viewer, user_tenant_memberships utm_target
    WHERE utm_viewer.user_id = auth.uid() 
      AND utm_target.user_id = profiles.id
      AND utm_viewer.tenant_id = utm_target.tenant_id
      AND utm_viewer.active = true 
      AND utm_target.active = true
  ))
);