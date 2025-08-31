-- Fix previous migration syntax and finalize non-recursive RLS

-- Ensure insert policy is created cleanly
DROP POLICY IF EXISTS "utm_insert_by_tenant_admin" ON public.user_tenant_memberships;
CREATE POLICY "utm_insert_by_tenant_admin"
ON public.user_tenant_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role_in_tenant(auth.uid(), tenant_id, 'admin')
  OR public.has_role_in_tenant(auth.uid(), tenant_id, 'super_admin')
);
