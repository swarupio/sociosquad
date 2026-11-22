-- Security hardening: WRITE-side policies, role assignment, server-owned stats, function grants.
-- Safe for the current client (no SELECT policy is tightened here). Idempotent.
BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: is_squad_member (SECURITY DEFINER avoids RLS recursion on squad_members)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_squad_member(p_user uuid, p_squad uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM public.squad_members WHERE user_id = p_user AND squad_id = p_squad) $$;

-- ---------------------------------------------------------------------------
-- DB-1: squad_members insert. Self only; role 'member', or 'leader' ONLY for a squad
-- the caller created (needed by the current client's create-squad flow).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can join squads" ON public.squad_members;
DROP POLICY IF EXISTS "Join as member or creator-leader" ON public.squad_members;
CREATE POLICY "Join as member or creator-leader" ON public.squad_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      role = 'member'
      OR (role = 'leader' AND EXISTS (
            SELECT 1 FROM public.squads s WHERE s.id = squad_id AND s.created_by = auth.uid()))
    )
  );

-- Invite-code join without letting the client choose a role.
CREATE OR REPLACE FUNCTION public.join_squad_by_code(p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO s FROM public.squads WHERE invite_code = lower(trim(p_code));
  IF s IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;
  INSERT INTO public.squad_members (squad_id, user_id, role)
  VALUES (s, auth.uid(), 'member') ON CONFLICT (squad_id, user_id) DO NOTHING;
  RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.join_squad_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_squad_by_code(text) TO authenticated;

-- Squad challenges: only squad members may create; creator update keeps ownership.
DROP POLICY IF EXISTS "Members can create challenges" ON public.squad_challenges;
CREATE POLICY "Members can create challenges" ON public.squad_challenges
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_squad_member(auth.uid(), squad_id));
DROP POLICY IF EXISTS "Creator can update challenges" ON public.squad_challenges;
CREATE POLICY "Creator can update challenges" ON public.squad_challenges
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by AND public.is_squad_member(auth.uid(), squad_id));

-- ---------------------------------------------------------------------------
-- AUTH-1: roles. Role comes from signUp metadata via trigger (allow-list); the client
-- can only insert its OWN row with volunteer/organization, never admin. There are no
-- UPDATE/DELETE policies on user_roles, so roles cannot be re-assigned or removed.
-- NOTE: raw_user_meta_data is user-supplied, so 'organization' is self-selectable
-- (same as before); 'admin' can never be obtained this way.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE requested text;
BEGIN
  requested := lower(COALESCE(NEW.raw_user_meta_data ->> 'role', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'volunteer')
    ON CONFLICT (user_id, role) DO NOTHING;
  IF requested = 'organization' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'organization')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
-- trigger on_auth_user_created_role already exists and calls this function.

DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
CREATE POLICY "Users can insert own role" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role IN ('volunteer'::public.app_role, 'organization'::public.app_role));

-- ---------------------------------------------------------------------------
-- DB-2 / DB-14: user_stats and user_activities are server-owned.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.user_activities;

-- Internal crediting function. Not callable by any client role.
CREATE OR REPLACE FUNCTION public.credit_user_stats(
  p_user uuid, p_hours int, p_xp int, p_tasks int DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, total_hours, xp, tasks_completed)
  VALUES (p_user, GREATEST(0, p_hours), GREATEST(0, p_xp), GREATEST(0, p_tasks))
  ON CONFLICT (user_id) DO UPDATE SET
    total_hours     = GREATEST(0, public.user_stats.total_hours + p_hours),
    xp              = GREATEST(0, public.user_stats.xp + p_xp),
    tasks_completed = GREATEST(0, public.user_stats.tasks_completed + p_tasks),
    updated_at      = now();
END $$;
REVOKE ALL ON FUNCTION public.credit_user_stats(uuid, int, int, int) FROM PUBLIC, anon, authenticated;

-- Credit/debit on attendance verification (delta based, so toggling cannot double count).
CREATE OR REPLACE FUNCTION public.credit_verified_hours()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_h int; new_h int; d_h int; d_t int;
BEGIN
  old_h := CASE WHEN OLD.attended IS TRUE THEN round(COALESCE(OLD.hours_credited, 0))::int ELSE 0 END;
  new_h := CASE WHEN NEW.attended IS TRUE THEN round(COALESCE(NEW.hours_credited, 0))::int ELSE 0 END;
  d_h := new_h - old_h;
  d_t := (CASE WHEN NEW.attended IS TRUE THEN 1 ELSE 0 END) - (CASE WHEN OLD.attended IS TRUE THEN 1 ELSE 0 END);
  IF d_h <> 0 OR d_t <> 0 THEN
    PERFORM public.credit_user_stats(NEW.user_id, d_h, 10 * d_h, d_t);
    IF d_t = 1 THEN
      INSERT INTO public.user_activities (user_id, action, target, xp)
      VALUES (NEW.user_id, 'Volunteered', 'Opportunity', 10 * new_h);
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.credit_verified_hours() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_credit_hours ON public.volunteer_registrations;
CREATE TRIGGER trg_credit_hours AFTER UPDATE ON public.volunteer_registrations
  FOR EACH ROW EXECUTE FUNCTION public.credit_verified_hours();

-- ---------------------------------------------------------------------------
-- DB-3: organizations. verified/user_id are not owner-writable. Admins (role 'admin',
-- checked by text so this file does not depend on the enum value) and service_role
-- (auth.uid() IS NULL) may change them.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_org_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_adm boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = auth.uid() AND ur.role::text = 'admin') INTO is_adm;
  IF is_adm THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
  ELSE
    NEW.verified := OLD.verified;
    NEW.user_id  := OLD.user_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_org_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_org ON public.organizations;
CREATE TRIGGER trg_protect_org BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.protect_org_columns();

DROP POLICY IF EXISTS "Owner can update org" ON public.organizations;
CREATE POLICY "Owner can update org" ON public.organizations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers (DB-18)
DROP TRIGGER IF EXISTS trg_org_updated ON public.organizations;
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_opp_updated ON public.opportunities;
CREATE TRIGGER trg_opp_updated BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_stats_updated ON public.user_stats;
CREATE TRIGGER trg_stats_updated BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- UNIQUE(user_id) on organizations, only if there are no duplicates (otherwise NOTICE + skip).
-- Manual check: SELECT user_id, count(*) FROM public.organizations GROUP BY user_id HAVING count(*) > 1;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.organizations GROUP BY user_id HAVING count(*) > 1) THEN
    RAISE NOTICE 'organizations has duplicate user_id rows; skipping unique index organizations_user_id_key';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS organizations_user_id_key ON public.organizations (user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- DB-4: volunteer_registrations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can register" ON public.volunteer_registrations;
CREATE POLICY "Users can register" ON public.volunteer_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'registered'
    AND COALESCE(attended, false) = false
    AND COALESCE(hours_credited, 0) = 0
    AND verified_by IS NULL AND verified_at IS NULL
  );

DROP POLICY IF EXISTS "Org owners can verify attendance" ON public.volunteer_registrations;
CREATE POLICY "Org owners can verify attendance" ON public.volunteer_registrations
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.opportunities op JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id::text = volunteer_registrations.opportunity_id::text AND o.user_id = auth.uid()))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.opportunities op JOIN public.organizations o ON o.id = op.org_id
      WHERE op.id::text = volunteer_registrations.opportunity_id::text AND o.user_id = auth.uid())
    AND COALESCE(hours_credited, 0) BETWEEN 0 AND 24
    AND (verified_by IS NULL OR verified_by = auth.uid())
  );

-- Freeze identity columns on update (owner and volunteer cannot be re-pointed).
CREATE OR REPLACE FUNCTION public.freeze_registration_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := OLD.user_id;
    NEW.opportunity_id := OLD.opportunity_id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_freeze_registration ON public.volunteer_registrations;
CREATE TRIGGER trg_freeze_registration BEFORE UPDATE ON public.volunteer_registrations
  FOR EACH ROW EXECUTE FUNCTION public.freeze_registration_identity();

-- ---------------------------------------------------------------------------
-- DB-5: squad_activity_logs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can submit logs" ON public.squad_activity_logs;
CREATE POLICY "Members can submit logs" ON public.squad_activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL
    AND value BETWEEN 1 AND 1000
    AND public.is_squad_member(auth.uid(), squad_id)
    AND EXISTS (SELECT 1 FROM public.squad_challenges c
                WHERE c.id = challenge_id AND c.squad_id = squad_activity_logs.squad_id)
  );

DROP POLICY IF EXISTS "Leaders can update logs" ON public.squad_activity_logs;
CREATE POLICY "Leaders can update logs" ON public.squad_activity_logs
  FOR UPDATE TO authenticated
  USING (public.is_squad_leader(auth.uid(), squad_id))
  WITH CHECK (
    public.is_squad_leader(auth.uid(), squad_id)
    AND status IN ('approved', 'rejected', 'pending')
    AND (reviewed_by IS NULL OR reviewed_by = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.freeze_log_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.squad_id := OLD.squad_id; NEW.challenge_id := OLD.challenge_id;
    NEW.user_id := OLD.user_id; NEW.value := OLD.value;
    NEW.description := OLD.description; NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_freeze_log ON public.squad_activity_logs;
CREATE TRIGGER trg_freeze_log BEFORE UPDATE ON public.squad_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.freeze_log_columns();

-- ---------------------------------------------------------------------------
-- DB-9: WITH CHECK on owner UPDATE policies (cannot reassign ownership)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
CREATE POLICY "Users can update own posts" ON public.community_posts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.user_tasks;
CREATE POLICY "Users can update own tasks" ON public.user_tasks
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own events" ON public.user_events;
CREATE POLICY "Users can update own events" ON public.user_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Creator can update squad" ON public.squads;
CREATE POLICY "Creator can update squad" ON public.squads
  FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Org owner can update" ON public.opportunities;
CREATE POLICY "Org owner can update" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- DB-7: function grants / search_path. Policies still work (they run as the caller,
-- who is `authenticated`); anon loses access.
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.get_challenge_progress(uuid) SET search_path = public;
ALTER FUNCTION public.get_member_contributions(uuid, text, timestamptz) SET search_path = public;
ALTER FUNCTION public.is_squad_leader(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;

REVOKE ALL ON FUNCTION public.get_challenge_progress(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_member_contributions(uuid, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_squad_leader(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_squad_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_challenge_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_contributions(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_squad_leader(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_squad_member(uuid, uuid) TO authenticated;

-- Trigger-only functions: nobody needs to call them directly.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;

COMMIT;
