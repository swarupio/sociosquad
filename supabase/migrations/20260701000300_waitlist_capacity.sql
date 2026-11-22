-- Server-enforced capacity + waitlist with auto-promotion.
-- NOTE: the existing client policy "Users can register" still allows direct inserts into
-- volunteer_registrations. The wl_enforce_capacity BEFORE INSERT trigger below makes such
-- inserts fail when an opportunity is full, but the client should call
-- register_for_opportunity() so overflow users are waitlisted instead of rejected.
BEGIN;

CREATE TABLE IF NOT EXISTS public.opportunity_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS opportunity_waitlist_opp_created_idx
  ON public.opportunity_waitlist (opportunity_id, created_at);

ALTER TABLE public.opportunity_waitlist ENABLE ROW LEVEL SECURITY;

-- Writes go through SECURITY DEFINER RPCs only.
REVOKE INSERT, UPDATE, DELETE ON public.opportunity_waitlist FROM anon, authenticated;

DROP POLICY IF EXISTS "Users read own waitlist rows" ON public.opportunity_waitlist;
CREATE POLICY "Users read own waitlist rows" ON public.opportunity_waitlist
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Org owners read their waitlist" ON public.opportunity_waitlist;
CREATE POLICY "Org owners read their waitlist" ON public.opportunity_waitlist
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = opportunity_waitlist.opportunity_id AND o.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins read waitlist" ON public.opportunity_waitlist;
CREATE POLICY "Admins read waitlist" ON public.opportunity_waitlist
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Internal helper: active registration count (type-agnostic comparison)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wl_registered_count(p_opportunity_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM public.volunteer_registrations r
  WHERE r.opportunity_id::text = p_opportunity_id::text
    AND COALESCE(r.status::text, '') <> 'cancelled';
$$;
REVOKE ALL ON FUNCTION public.wl_registered_count(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- BEFORE INSERT capacity guard (bypassed only by our own RPC/trigger context)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wl_enforce_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_max int;
BEGIN
  IF COALESCE(current_setting('app.wl_bypass', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  SELECT op.id, op.max_volunteers INTO v_id, v_max
  FROM public.opportunities op
  WHERE op.id::text = NEW.opportunity_id::text
  FOR UPDATE;

  -- Unknown (e.g. static) opportunity or no limit: nothing to enforce.
  IF v_id IS NULL OR v_max IS NULL OR v_max <= 0 THEN
    RETURN NEW;
  END IF;

  IF public.wl_registered_count(v_id) >= v_max THEN
    RAISE EXCEPTION 'This opportunity is full' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.wl_enforce_capacity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wl_enforce_capacity ON public.volunteer_registrations;
CREATE TRIGGER wl_enforce_capacity
  BEFORE INSERT ON public.volunteer_registrations
  FOR EACH ROW EXECUTE FUNCTION public.wl_enforce_capacity();

-- ---------------------------------------------------------------------------
-- AFTER DELETE: promote earliest waitlisted user(s) while spots remain
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wl_promote_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_max int;
  v_wl record;
BEGIN
  SELECT op.id, op.max_volunteers INTO v_id, v_max
  FROM public.opportunities op
  WHERE op.id::text = OLD.opportunity_id::text
  FOR UPDATE;

  IF v_id IS NULL OR v_max IS NULL OR v_max <= 0 THEN
    RETURN OLD;
  END IF;

  WHILE public.wl_registered_count(v_id) < v_max LOOP
    SELECT w.id, w.user_id INTO v_wl
    FROM public.opportunity_waitlist w
    WHERE w.opportunity_id = v_id
    ORDER BY w.created_at, w.id
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    EXIT WHEN v_wl.id IS NULL;

    DELETE FROM public.opportunity_waitlist WHERE id = v_wl.id;

    PERFORM set_config('app.wl_bypass', '1', true);
    BEGIN
      EXECUTE format(
        'INSERT INTO public.volunteer_registrations (opportunity_id, user_id) VALUES (%L, %L)',
        v_id, v_wl.user_id);
    EXCEPTION WHEN unique_violation THEN
      NULL; -- already registered: just drop the waitlist row
    END;
    PERFORM set_config('app.wl_bypass', '0', true);
  END LOOP;

  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.wl_promote_on_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS wl_promote_on_delete ON public.volunteer_registrations;
CREATE TRIGGER wl_promote_on_delete
  AFTER DELETE ON public.volunteer_registrations
  FOR EACH ROW EXECUTE FUNCTION public.wl_promote_on_delete();

-- ---------------------------------------------------------------------------
-- RPC: waitlist_position
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.waitlist_position(p_opportunity_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT count(*)::int FROM public.opportunity_waitlist w2
    WHERE w2.opportunity_id = w.opportunity_id
      AND (w2.created_at, w2.id) <= (w.created_at, w.id)
  )
  FROM public.opportunity_waitlist w
  WHERE w.opportunity_id = p_opportunity_id AND w.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.waitlist_position(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.waitlist_position(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: register_for_opportunity -> {status: registered|waitlisted, position}
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_for_opportunity(p_opportunity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status text;
  v_date date;
  v_max int;
  v_pos int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT op.status::text, op.date::date, op.max_volunteers
    INTO v_status, v_date, v_max
  FROM public.opportunities op
  WHERE op.id = p_opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opportunity not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'This opportunity is not open for registration' USING ERRCODE = 'P0001';
  END IF;
  IF v_date IS NOT NULL AND v_date < current_date THEN
    RAISE EXCEPTION 'This opportunity has already taken place' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.volunteer_registrations r
    WHERE r.opportunity_id::text = p_opportunity_id::text AND r.user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('status', 'registered', 'position', NULL);
  END IF;

  IF v_max IS NULL OR v_max <= 0 OR public.wl_registered_count(p_opportunity_id) < v_max THEN
    PERFORM set_config('app.wl_bypass', '1', true);
    EXECUTE format(
      'INSERT INTO public.volunteer_registrations (opportunity_id, user_id) VALUES (%L, %L)',
      p_opportunity_id, v_uid);
    PERFORM set_config('app.wl_bypass', '0', true);
    DELETE FROM public.opportunity_waitlist
      WHERE opportunity_id = p_opportunity_id AND user_id = v_uid;
    RETURN jsonb_build_object('status', 'registered', 'position', NULL);
  END IF;

  INSERT INTO public.opportunity_waitlist (opportunity_id, user_id)
  VALUES (p_opportunity_id, v_uid)
  ON CONFLICT (opportunity_id, user_id) DO NOTHING;

  v_pos := public.waitlist_position(p_opportunity_id);
  RETURN jsonb_build_object('status', 'waitlisted', 'position', v_pos);
END;
$$;
REVOKE ALL ON FUNCTION public.register_for_opportunity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_opportunity(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: leave_waitlist
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_waitlist(p_opportunity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  DELETE FROM public.opportunity_waitlist
  WHERE opportunity_id = p_opportunity_id AND user_id = auth.uid();
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.leave_waitlist(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_waitlist(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: get_opportunity_capacity (counts only; visible to any authenticated user)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_opportunity_capacity(p_ids uuid[])
RETURNS TABLE (opportunity_id uuid, registered bigint, waitlisted bigint, max_volunteers int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT op.id,
         (SELECT count(*) FROM public.volunteer_registrations r
           WHERE r.opportunity_id::text = op.id::text
             AND COALESCE(r.status::text, '') <> 'cancelled'),
         (SELECT count(*) FROM public.opportunity_waitlist w WHERE w.opportunity_id = op.id),
         op.max_volunteers
  FROM public.opportunities op
  WHERE op.id = ANY (p_ids);
$$;
REVOKE ALL ON FUNCTION public.get_opportunity_capacity(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_opportunity_capacity(uuid[]) TO authenticated;

COMMIT;
