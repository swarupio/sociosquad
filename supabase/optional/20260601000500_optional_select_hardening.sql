-- OPTIONAL. DO NOT APPLY until the client uses the replacement RPCs listed in
-- supabase/MIGRATIONS_README.md ("Requires client change"). Applying early breaks the
-- Squads list/join flow and NGO/opportunity registration counts.
-- Requires 20260601000300_admin_foundation.sql (uses is_admin).
BEGIN;

-- Replacement RPCs ----------------------------------------------------------
-- Browse squads without invite_code / member lists.
CREATE OR REPLACE FUNCTION public.list_squads()
RETURNS TABLE(id uuid, name text, description text, avatar_emoji text, created_at timestamptz,
              member_count bigint, is_member boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.description, s.avatar_emoji, s.created_at,
         (SELECT count(*) FROM public.squad_members m WHERE m.squad_id = s.id),
         EXISTS (SELECT 1 FROM public.squad_members m WHERE m.squad_id = s.id AND m.user_id = auth.uid())
  FROM public.squads s ORDER BY s.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.list_squads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_squads() TO authenticated;

-- Registration counts per opportunity (ids are text because opportunity_id is text).
CREATE OR REPLACE FUNCTION public.get_opportunity_registration_counts(p_ids text[])
RETURNS TABLE(opportunity_id text, registration_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.opportunity_id, count(*) FROM public.volunteer_registrations r
  WHERE r.opportunity_id = ANY (p_ids) GROUP BY r.opportunity_id
$$;
REVOKE ALL ON FUNCTION public.get_opportunity_registration_counts(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_opportunity_registration_counts(text[]) TO authenticated;

-- Leader row on squad creation (client must stop inserting it itself, else duplicate key).
CREATE OR REPLACE FUNCTION public.add_squad_creator()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.squad_members (squad_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'leader')
  ON CONFLICT (squad_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.add_squad_creator() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_add_squad_creator ON public.squads;
CREATE TRIGGER trg_add_squad_creator AFTER INSERT ON public.squads
  FOR EACH ROW EXECUTE FUNCTION public.add_squad_creator();

-- Members-only challenge progress / contributions.
CREATE OR REPLACE FUNCTION public.get_challenge_progress(challenge_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT SUM(sal.value) FROM public.squad_activity_logs sal
     JOIN public.squad_challenges sc ON sc.id = sal.challenge_id
     WHERE sal.challenge_id = get_challenge_progress.challenge_id AND sal.status = 'approved'
       AND public.is_squad_member(auth.uid(), sc.squad_id)), 0)::integer;
$$;
CREATE OR REPLACE FUNCTION public.get_member_contributions(p_squad_id uuid, p_unit text, p_since timestamptz DEFAULT '1970-01-01')
RETURNS TABLE(user_id uuid, contribution bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sm.user_id,
    COALESCE((SELECT SUM(sal.value) FROM public.squad_activity_logs sal
      WHERE sal.user_id = sm.user_id AND sal.squad_id = p_squad_id
        AND sal.status = 'approved' AND sal.created_at >= p_since), 0)::bigint
  FROM public.squad_members sm
  WHERE sm.squad_id = p_squad_id AND public.is_squad_member(auth.uid(), p_squad_id);
$$;

-- Tightened SELECT policies ---------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view squads" ON public.squads;
DROP POLICY IF EXISTS "Members view squads" ON public.squads;
CREATE POLICY "Members view squads" ON public.squads FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_squad_member(auth.uid(), id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view squad members" ON public.squad_members;
DROP POLICY IF EXISTS "Members view squad members" ON public.squad_members;
CREATE POLICY "Members view squad members" ON public.squad_members FOR SELECT TO authenticated
  USING (public.is_squad_member(auth.uid(), squad_id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Members can view challenges" ON public.squad_challenges;
CREATE POLICY "Members can view challenges" ON public.squad_challenges FOR SELECT TO authenticated
  USING (public.is_squad_member(auth.uid(), squad_id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Members can view squad logs" ON public.squad_activity_logs;
CREATE POLICY "Members can view squad logs" ON public.squad_activity_logs FOR SELECT TO authenticated
  USING (public.is_squad_member(auth.uid(), squad_id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view registrations" ON public.volunteer_registrations;
DROP POLICY IF EXISTS "View own or managed registrations" ON public.volunteer_registrations;
CREATE POLICY "View own or managed registrations" ON public.volunteer_registrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.opportunities op JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id::text = volunteer_registrations.opportunity_id AND o.user_id = auth.uid()));

COMMIT;
