-- Admin foundation. Requires 20260601000000_admin_role_enum.sql to be applied first.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin(p_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role = 'admin'::public.app_role) $$;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL,
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   text,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_log(created_at DESC);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins write audit log" ON public.admin_audit_log;
CREATE POLICY "Admins write audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND admin_id = auth.uid());
-- Append-only for clients
REVOKE ALL ON public.admin_audit_log FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON public.admin_audit_log FROM authenticated;

-- Admin read access (survives the optional SELECT tightening migration)
DROP POLICY IF EXISTS "Admins read profiles" ON public.profiles;
CREATE POLICY "Admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins read organizations" ON public.organizations;
CREATE POLICY "Admins read organizations" ON public.organizations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins read opportunities" ON public.opportunities;
CREATE POLICY "Admins read opportunities" ON public.opportunities FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins read registrations" ON public.volunteer_registrations;
CREATE POLICY "Admins read registrations" ON public.volunteer_registrations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins read user_roles" ON public.user_roles;
CREATE POLICY "Admins read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Verify / unverify an organization (trigger protect_org_columns lets admins change `verified`)
CREATE OR REPLACE FUNCTION public.admin_set_org_verified(p_org_id uuid, p_verified boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_v boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT verified INTO old_v FROM public.organizations WHERE id = p_org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'organization not found'; END IF;
  UPDATE public.organizations SET verified = p_verified WHERE id = p_org_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'set_org_verified', 'organization', p_org_id::text,
          jsonb_build_object('from', old_v, 'to', p_verified));
END $$;
REVOKE ALL ON FUNCTION public.admin_set_org_verified(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_org_verified(uuid, boolean) TO authenticated;

-- Grant or revoke a role. An admin cannot revoke their own admin role (lock-out guard).
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id uuid, p_role public.app_role, p_grant boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF p_role = 'admin'::public.app_role AND p_user_id = auth.uid() THEN
      RAISE EXCEPTION 'admins cannot revoke their own admin role';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = p_role;
  END IF;
  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), CASE WHEN p_grant THEN 'grant_role' ELSE 'revoke_role' END, 'user', p_user_id::text,
          jsonb_build_object('role', p_role::text));
END $$;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) TO authenticated;

COMMIT;
