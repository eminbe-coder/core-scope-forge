-- 1) Ensure moaath@essensia.bh is super admin and has a membership row
DO $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'moaath@essensia.bh' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found in auth.users. Skipping super admin grant.', 'moaath@essensia.bh';
  ELSE
    -- Ensure there is at least one tenant to attach the super_admin membership to
    SELECT id INTO v_tenant_id FROM public.tenants ORDER BY created_at ASC LIMIT 1;

    IF v_tenant_id IS NULL THEN
      INSERT INTO public.tenants (name, slug, domain, active, settings)
      VALUES ('Platform', 'platform', NULL, true, '{}'::jsonb)
      RETURNING id INTO v_tenant_id;
    END IF;

    -- Create super_admin membership if it doesn't exist for this user
    IF NOT EXISTS (
      SELECT 1 FROM public.user_tenant_memberships
      WHERE user_id = v_user_id AND role = 'super_admin'::public.app_role AND active = true
    ) THEN
      INSERT INTO public.user_tenant_memberships (user_id, tenant_id, role, active)
      VALUES (v_user_id, v_tenant_id, 'super_admin'::public.app_role, true);
    END IF;
  END IF;
END
$$;

-- 2) Relax tenant RLS to rely only on user_has_tenant_access(auth.uid(), tenant_id)
--    Remove dependence on get_current_tenant_id() which requires per-request GUC settings.

-- activities
DROP POLICY IF EXISTS "Tenant access for activities" ON public.activities;
CREATE POLICY "Tenant access for activities" ON public.activities
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- categories
DROP POLICY IF EXISTS "Tenant access for categories" ON public.categories;
CREATE POLICY "Tenant access for categories" ON public.categories
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- contacts
DROP POLICY IF EXISTS "Tenant access for contacts" ON public.contacts;
CREATE POLICY "Tenant access for contacts" ON public.contacts
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- customers
DROP POLICY IF EXISTS "Tenant access for customers" ON public.customers;
CREATE POLICY "Tenant access for customers" ON public.customers
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- deals
DROP POLICY IF EXISTS "Tenant access for deals" ON public.deals;
CREATE POLICY "Tenant access for deals" ON public.deals
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- devices
DROP POLICY IF EXISTS "Tenant access for devices" ON public.devices;
CREATE POLICY "Tenant access for devices" ON public.devices
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- projects
DROP POLICY IF EXISTS "Tenant access for projects" ON public.projects;
CREATE POLICY "Tenant access for projects" ON public.projects
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- role_permissions
DROP POLICY IF EXISTS "Tenant access for role permissions" ON public.role_permissions;
CREATE POLICY "Tenant access for role permissions" ON public.role_permissions
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- sites
DROP POLICY IF EXISTS "Tenant access for sites" ON public.sites;
CREATE POLICY "Tenant access for sites" ON public.sites
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- user_action_logs
DROP POLICY IF EXISTS "Tenant access for user action logs" ON public.user_action_logs;
CREATE POLICY "Tenant access for user action logs" ON public.user_action_logs
FOR ALL TO authenticated
USING (user_has_tenant_access(auth.uid(), tenant_id))
WITH CHECK (user_has_tenant_access(auth.uid(), tenant_id));

-- contact_sites (via contacts)
DROP POLICY IF EXISTS "Tenant access for contact sites" ON public.contact_sites;
CREATE POLICY "Tenant access for contact sites" ON public.contact_sites
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contacts
  WHERE contacts.id = contact_sites.contact_id
    AND user_has_tenant_access(auth.uid(), contacts.tenant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.contacts
  WHERE contacts.id = contact_sites.contact_id
    AND user_has_tenant_access(auth.uid(), contacts.tenant_id)
));

-- project_devices (via projects)
DROP POLICY IF EXISTS "Tenant access for project devices" ON public.project_devices;
CREATE POLICY "Tenant access for project devices" ON public.project_devices
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects
  WHERE projects.id = project_devices.project_id
    AND user_has_tenant_access(auth.uid(), projects.tenant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects
  WHERE projects.id = project_devices.project_id
    AND user_has_tenant_access(auth.uid(), projects.tenant_id)
));

-- project_floors (via projects)
DROP POLICY IF EXISTS "Tenant access for project floors" ON public.project_floors;
CREATE POLICY "Tenant access for project floors" ON public.project_floors
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects
  WHERE projects.id = project_floors.project_id
    AND user_has_tenant_access(auth.uid(), projects.tenant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects
  WHERE projects.id = project_floors.project_id
    AND user_has_tenant_access(auth.uid(), projects.tenant_id)
));

-- project_sites (via projects)
DROP POLICY IF EXISTS "Tenant access for project sites" ON public.project_sites;
CREATE POLICY "Tenant access for project sites" ON public.project_sites
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects
  WHERE projects.id = project_sites.project_id
    AND user_has_tenant_access(auth.uid(), projects.tenant_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects
  WHERE projects.id = project_sites.project_id
    AND user_has_tenant_access(auth.uid(), projects.tenant_id)
));