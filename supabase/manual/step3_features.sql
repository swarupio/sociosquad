-- STEP 3: new feature migrations (matching, check-in, waitlist, notifications, badges, feedback, analytics, recurring, announcements, certificates).
-- Run AFTER step 2. Idempotent; safe to re-run. If one block errors, tell Claude which -- ===== header it is under.

-- ===== 20260701000100_volunteer_preferences =====
BEGIN;

CREATE TABLE IF NOT EXISTS public.volunteer_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  skills text[] NOT NULL DEFAULT '{}',
  causes text[] NOT NULL DEFAULT '{}',
  max_distance_km integer,
  availability text[] NOT NULL DEFAULT '{}',
  home_latitude double precision,
  home_longitude double precision,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vp_skills_len CHECK (cardinality(skills) <= 30),
  CONSTRAINT vp_causes_len CHECK (cardinality(causes) <= 30),
  CONSTRAINT vp_availability_len CHECK (cardinality(availability) <= 30),
  CONSTRAINT vp_distance_range CHECK (max_distance_km IS NULL OR (max_distance_km BETWEEN 1 AND 500)),
  CONSTRAINT vp_lat_range CHECK (home_latitude IS NULL OR (home_latitude BETWEEN -90 AND 90)),
  CONSTRAINT vp_lng_range CHECK (home_longitude IS NULL OR (home_longitude BETWEEN -180 AND 180))
);

ALTER TABLE public.volunteer_preferences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.vp_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vp_set_updated_at ON public.volunteer_preferences;
CREATE TRIGGER vp_set_updated_at
  BEFORE INSERT OR UPDATE ON public.volunteer_preferences
  FOR EACH ROW EXECUTE FUNCTION public.vp_set_updated_at();

DROP POLICY IF EXISTS "vp_select_own" ON public.volunteer_preferences;
CREATE POLICY "vp_select_own" ON public.volunteer_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "vp_insert_own" ON public.volunteer_preferences;
CREATE POLICY "vp_insert_own" ON public.volunteer_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "vp_update_own" ON public.volunteer_preferences;
CREATE POLICY "vp_update_own" ON public.volunteer_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "vp_delete_own" ON public.volunteer_preferences;
CREATE POLICY "vp_delete_own" ON public.volunteer_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON public.volunteer_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_preferences TO authenticated;

COMMIT;

-- ===== 20260701000200_qr_checkin =====
-- QR / code check-in.
-- Org shows a rotating code; volunteers submit it; attendance is recorded server-side.
-- NOTE: check-in only sets attended=true (and status 'registered' -> 'attended').
-- It never touches hours_credited / verified_by / verified_at; the organization still
-- verifies and credits hours, which fires the credit_verified_hours trigger.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.checkin_codes (
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checkin_codes_opportunity_unique UNIQUE (opportunity_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS checkin_codes_code_idx ON public.checkin_codes (code);

ALTER TABLE public.checkin_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkin_codes owner select" ON public.checkin_codes;
CREATE POLICY "checkin_codes owner select" ON public.checkin_codes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = checkin_codes.opportunity_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "checkin_codes owner insert" ON public.checkin_codes;
CREATE POLICY "checkin_codes owner insert" ON public.checkin_codes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = checkin_codes.opportunity_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "checkin_codes owner update" ON public.checkin_codes;
CREATE POLICY "checkin_codes owner update" ON public.checkin_codes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = checkin_codes.opportunity_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = checkin_codes.opportunity_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "checkin_codes owner delete" ON public.checkin_codes;
CREATE POLICY "checkin_codes owner delete" ON public.checkin_codes
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = checkin_codes.opportunity_id AND o.user_id = auth.uid()));

REVOKE ALL ON public.checkin_codes FROM anon;

-- Failed-attempt log for simple rate limiting (no client access at all).
CREATE TABLE IF NOT EXISTS public.checkin_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkin_attempts_user_idx ON public.checkin_attempts (user_id, created_at DESC);
ALTER TABLE public.checkin_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkin_attempts FROM PUBLIC, anon, authenticated;

-- Rotate (or create) the code for an opportunity. Owner only.
CREATE OR REPLACE FUNCTION public.org_rotate_checkin_code(p_opportunity_id uuid, p_ttl_minutes int DEFAULT 120)
RETURNS TABLE (code text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ttl int := LEAST(1440, GREATEST(5, COALESCE(p_ttl_minutes, 120)));
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_code text;
  v_bytes bytea;
  v_exp timestamptz := now() + make_interval(mins => v_ttl);
  i int;
  tries int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = p_opportunity_id AND o.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  LOOP
    v_bytes := gen_random_bytes(8);
    v_code := '';
    FOR i IN 0..7 LOOP
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    END LOOP;
    BEGIN
      INSERT INTO public.checkin_codes AS c (opportunity_id, code, expires_at, created_by, created_at)
      VALUES (p_opportunity_id, v_code, v_exp, v_uid, now())
      ON CONFLICT ON CONSTRAINT checkin_codes_opportunity_unique
      DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at,
                    created_by = EXCLUDED.created_by, created_at = now();
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      tries := tries + 1;
      IF tries > 5 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_code, v_exp;
END;
$$;

REVOKE ALL ON FUNCTION public.org_rotate_checkin_code(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_rotate_checkin_code(uuid, int) TO authenticated;

-- Volunteer check-in by code. Idempotent.
CREATE OR REPLACE FUNCTION public.volunteer_check_in(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_opp uuid;
  v_title text;
  v_date date;
  v_reg record;
  v_recent int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT count(*) INTO v_recent FROM public.checkin_attempts
   WHERE user_id = v_uid AND created_at > now() - interval '10 minutes';
  IF v_recent >= 10 THEN
    RAISE EXCEPTION 'Too many attempts, try again in a few minutes' USING ERRCODE = '54000';
  END IF;

  v_code := upper(regexp_replace(COALESCE(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_code := translate(v_code, 'OIL', '011');

  SELECT c.opportunity_id INTO v_opp
    FROM public.checkin_codes c
   WHERE c.code = v_code AND c.expires_at > now()
   LIMIT 1;

  IF v_opp IS NULL THEN
    INSERT INTO public.checkin_attempts (user_id) VALUES (v_uid);
    DELETE FROM public.checkin_attempts WHERE created_at < now() - interval '1 day';
    -- Return (not raise) so the logged attempt is committed and the rate limit works.
    RETURN json_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT op.title, op.date::date INTO v_title, v_date
    FROM public.opportunities op WHERE op.id = v_opp;

  IF v_date IS NOT NULL AND abs(v_date - (now() AT TIME ZONE 'Asia/Kolkata')::date) > 1 THEN
    RAISE EXCEPTION 'Check-in is only open around the event day' USING ERRCODE = 'P0001';
  END IF;

  SELECT r.id, r.status, r.attended INTO v_reg
    FROM public.volunteer_registrations r
   WHERE r.opportunity_id::text = v_opp::text AND r.user_id = v_uid
   ORDER BY r.created_at DESC
   LIMIT 1;

  IF v_reg.id IS NULL THEN
    RAISE EXCEPTION 'You are not registered for this opportunity' USING ERRCODE = 'P0003';
  END IF;

  IF v_reg.status IN ('cancelled', 'rejected', 'declined') THEN
    RAISE EXCEPTION 'Your registration is not active' USING ERRCODE = 'P0003';
  END IF;

  IF COALESCE(v_reg.attended, false) THEN
    RETURN json_build_object('ok', true, 'opportunity_id', v_opp, 'title', v_title, 'already', true);
  END IF;

  UPDATE public.volunteer_registrations
     SET attended = true,
         status = CASE WHEN status = 'registered' THEN 'attended' ELSE status END
   WHERE id = v_reg.id;

  RETURN json_build_object('ok', true, 'opportunity_id', v_opp, 'title', v_title, 'already', false);
END;
$$;

REVOKE ALL ON FUNCTION public.volunteer_check_in(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.volunteer_check_in(text) TO authenticated;

COMMIT;

-- ===== 20260701000300_waitlist_capacity =====
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

-- ===== 20260701000400_notifications =====
-- Notifications center: inbox table, RPCs, registration triggers, realtime.
BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('reminder','registration','verification','announcement','badge','waitlist','system')),
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_link_relative CHECK (link IS NULL OR (link LIKE '/%' AND link NOT LIKE '//%'))
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- No INSERT / UPDATE policies: writes go through SECURITY DEFINER functions only.
REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT, UPDATE ON public.notifications FROM authenticated;
GRANT SELECT, DELETE ON public.notifications TO authenticated;

-- Server-internal: create a notification.
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user uuid, p_type text, p_title text, p_body text DEFAULT NULL, p_link text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_user IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (p_user, p_type, left(p_title, 200), left(p_body, 1000),
          CASE WHEN p_link LIKE '/%' AND p_link NOT LIKE '//%' THEN p_link ELSE NULL END)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Client: mark own notifications read (null = all).
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.notifications
     SET read_at = now()
   WHERE user_id = auth.uid()
     AND read_at IS NULL
     AND (p_ids IS NULL OR id = ANY (p_ids));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;

-- Retention helper (server/cron only).
CREATE OR REPLACE FUNCTION public.purge_old_notifications(p_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.notifications
   WHERE created_at < now() - make_interval(days => GREATEST(p_days, 7))
     AND read_at IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.purge_old_notifications(integer) FROM PUBLIC, anon, authenticated;

-- Trigger: registration created.
CREATE OR REPLACE FUNCTION public.ntf_registration_created()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT op.title INTO v_title FROM public.opportunities op
   WHERE op.id::text = NEW.opportunity_id::text;
  PERFORM public.notify_user(
    NEW.user_id, 'registration',
    'You''re registered for ' || COALESCE(v_title, 'an opportunity'),
    'See the details in your schedule.',
    '/schedule');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never block a registration because of a notification
END $$;
REVOKE ALL ON FUNCTION public.ntf_registration_created() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ntf_registration_created_trg ON public.volunteer_registrations;
CREATE TRIGGER ntf_registration_created_trg
  AFTER INSERT ON public.volunteer_registrations
  FOR EACH ROW EXECUTE FUNCTION public.ntf_registration_created();

-- Trigger: attendance verified / hours credited.
CREATE OR REPLACE FUNCTION public.ntf_registration_verified()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  IF (NEW.attended IS TRUE AND OLD.attended IS DISTINCT FROM TRUE)
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'verified') THEN
    SELECT op.title INTO v_title FROM public.opportunities op
     WHERE op.id::text = NEW.opportunity_id::text;
    PERFORM public.notify_user(
      NEW.user_id, 'verification',
      'Your participation was verified',
      COALESCE(v_title, 'An opportunity') ||
        CASE WHEN COALESCE(NEW.hours_credited, 0) > 0
             THEN ': ' || NEW.hours_credited::text || ' hours credited.'
             ELSE ': thank you for volunteering!' END,
      '/dashboard');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.ntf_registration_verified() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ntf_registration_verified_trg ON public.volunteer_registrations;
CREATE TRIGGER ntf_registration_verified_trg
  AFTER UPDATE ON public.volunteer_registrations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.attended IS DISTINCT FROM NEW.attended)
  EXECUTE FUNCTION public.ntf_registration_verified();

-- Realtime publication (guarded).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

COMMIT;

-- ===== 20260701000500_badges_streaks =====
-- Badges, milestones and weekly streaks (idempotent)
BEGIN;

CREATE TABLE IF NOT EXISTS public.badge_definitions (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Award',
  tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold')),
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL,
  badge_code text NOT NULL REFERENCES public.badge_definitions(code) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);

CREATE INDEX IF NOT EXISTS user_badges_user_idx ON public.user_badges(user_id);

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badge_definitions_read" ON public.badge_definitions;
CREATE POLICY "badge_definitions_read" ON public.badge_definitions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_badges_select_own" ON public.user_badges;
CREATE POLICY "user_badges_select_own" ON public.user_badges
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- No client writes: grants only allow SELECT.
REVOKE ALL ON public.badge_definitions FROM PUBLIC, anon;
REVOKE ALL ON public.user_badges FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON public.badge_definitions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_badges FROM authenticated;
GRANT SELECT ON public.badge_definitions TO authenticated;
GRANT SELECT ON public.user_badges TO authenticated;

INSERT INTO public.badge_definitions (code, name, description, icon, tier, criteria, sort) VALUES
  ('first_step', 'First Step', 'Complete your first verified volunteering event.', 'Footprints', 'bronze', '{"type":"events","target":1}', 10),
  ('committed', 'Committed', 'Complete 5 verified events.', 'HeartHandshake', 'silver', '{"type":"events","target":5}', 20),
  ('hours_10', '10 Hour Helper', 'Volunteer for 10 verified hours.', 'Clock', 'bronze', '{"type":"hours","target":10}', 30),
  ('hours_50', '50 Hour Hero', 'Volunteer for 50 verified hours.', 'Medal', 'silver', '{"type":"hours","target":50}', 40),
  ('hours_100', 'Century Club', 'Volunteer for 100 verified hours.', 'Trophy', 'gold', '{"type":"hours","target":100}', 50),
  ('cause_explorer', 'Cause Explorer', 'Volunteer across 3 different causes.', 'Compass', 'silver', '{"type":"categories","target":3}', 60),
  ('weekend_warrior', 'Weekend Warrior', 'Complete 3 verified weekend events.', 'CalendarDays', 'silver', '{"type":"weekend_events","target":3}', 70),
  ('streak_4', 'Four Week Streak', 'Volunteer in 4 consecutive weeks.', 'Flame', 'gold', '{"type":"streak_weeks","target":4}', 80),
  ('early_bird', 'Early Bird', 'Complete 3 verified events starting before 09:00.', 'Sunrise', 'bronze', '{"type":"early_events","target":3}', 90)
ON CONFLICT (code) DO NOTHING;

-- Internal: streak numbers for a user (not exposed to clients directly).
CREATE OR REPLACE FUNCTION public.bdg_streak(p_user uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH weeks AS (
    SELECT DISTINCT date_trunc('week', op.date::date)::date AS wk
    FROM public.volunteer_registrations r
    JOIN public.opportunities op ON op.id::text = r.opportunity_id::text
    WHERE r.user_id = p_user
      AND r.attended IS TRUE
      AND coalesce(r.hours_credited, 0) > 0
      AND op.date IS NOT NULL
  ),
  numbered AS (
    SELECT wk,
           ((wk - date '2001-01-01') / 7) - row_number() OVER (ORDER BY wk) AS grp
    FROM weeks
  ),
  runs AS (
    SELECT grp, count(*)::int AS len, max(wk) AS last_wk
    FROM numbered GROUP BY grp
  ),
  last_run AS (
    SELECT len, last_wk FROM runs ORDER BY last_wk DESC LIMIT 1
  )
  SELECT json_build_object(
    'current_weeks',
      coalesce((SELECT CASE
          WHEN last_wk >= date_trunc('week', current_date)::date - 7 THEN len
          ELSE 0 END FROM last_run), 0),
    'longest_weeks', coalesce((SELECT max(len) FROM runs), 0),
    'last_active_week', (SELECT max(wk) FROM weeks)
  );
$$;

REVOKE ALL ON FUNCTION public.bdg_streak(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_streak()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  RETURN public.bdg_streak(auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_streak() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_streak() TO authenticated;

-- Internal: evaluate without auth checks (used by trigger and evaluate_badges).
CREATE OR REPLACE FUNCTION public.bdg_evaluate(p_user uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events int;
  v_hours numeric;
  v_cats int;
  v_weekend int;
  v_early int;
  v_streak int;
  v_new text[];
BEGIN
  SELECT count(*)::int,
         coalesce(sum(r.hours_credited), 0),
         count(DISTINCT lower(btrim(op.category))) FILTER (WHERE coalesce(btrim(op.category), '') <> '')::int,
         count(*) FILTER (WHERE extract(isodow FROM op.date::date) IN (6, 7))::int,
         count(*) FILTER (WHERE op.start_time IS NOT NULL AND op.start_time::text <> ''
                          AND op.start_time::text::time < time '09:00')::int
    INTO v_events, v_hours, v_cats, v_weekend, v_early
  FROM public.volunteer_registrations r
  JOIN public.opportunities op ON op.id::text = r.opportunity_id::text
  WHERE r.user_id = p_user
    AND r.attended IS TRUE
    AND coalesce(r.hours_credited, 0) > 0;

  v_streak := coalesce((public.bdg_streak(p_user)->>'longest_weeks')::int, 0);

  WITH ins AS (
    INSERT INTO public.user_badges (user_id, badge_code)
    SELECT p_user, d.code
    FROM public.badge_definitions d
    WHERE (d.criteria->>'target') IS NOT NULL
      AND CASE d.criteria->>'type'
            WHEN 'events' THEN v_events
            WHEN 'hours' THEN v_hours
            WHEN 'categories' THEN v_cats
            WHEN 'weekend_events' THEN v_weekend
            WHEN 'early_events' THEN v_early
            WHEN 'streak_weeks' THEN v_streak
            ELSE -1
          END >= (d.criteria->>'target')::numeric
    ON CONFLICT (user_id, badge_code) DO NOTHING
    RETURNING badge_code
  )
  SELECT coalesce(array_agg(badge_code), ARRAY[]::text[]) INTO v_new FROM ins;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.bdg_evaluate(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.evaluate_badges(p_user uuid DEFAULT auth.uid())
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_user IS NULL THEN
    p_user := auth.uid();
  END IF;
  IF p_user <> auth.uid() AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN public.bdg_evaluate(p_user);
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_badges(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_badges(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bdg_on_registration_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.attended IS DISTINCT FROM OLD.attended
     OR NEW.hours_credited IS DISTINCT FROM OLD.hours_credited THEN
    BEGIN
      PERFORM public.bdg_evaluate(NEW.user_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'bdg_on_registration_update failed for user %: %', NEW.user_id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bdg_on_registration_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bdg_registration_verified ON public.volunteer_registrations;
CREATE TRIGGER bdg_registration_verified
  AFTER UPDATE ON public.volunteer_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.bdg_on_registration_update();

COMMIT;

-- ===== 20260701000600_feedback =====
BEGIN;

-- Helper: has this user an attended registration for the opportunity?
CREATE OR REPLACE FUNCTION public.feedback_attended(p_opportunity_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.volunteer_registrations r
    WHERE r.opportunity_id::text = p_opportunity_id::text
      AND r.user_id = p_user_id
      AND r.attended IS TRUE
  );
$$;

-- Helper: may this org (owned by caller) endorse this volunteer?
CREATE OR REPLACE FUNCTION public.feedback_can_endorse(p_volunteer_id uuid, p_org_id uuid, p_opportunity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN public.opportunities op ON op.org_id = o.id
    JOIN public.volunteer_registrations r ON r.opportunity_id::text = op.id::text
    WHERE o.id = p_org_id
      AND o.user_id = auth.uid()
      AND r.user_id = p_volunteer_id
      AND r.attended IS TRUE
      AND (p_opportunity_id IS NULL OR op.id = p_opportunity_id)
  );
$$;

REVOKE ALL ON FUNCTION public.feedback_attended(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feedback_can_endorse(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feedback_attended(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feedback_can_endorse(uuid, uuid, uuid) TO authenticated;

-- Reviews
CREATE TABLE IF NOT EXISTS public.opportunity_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, user_id)
);
CREATE INDEX IF NOT EXISTS opportunity_reviews_opp_idx ON public.opportunity_reviews (opportunity_id, created_at DESC);

ALTER TABLE public.opportunity_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_authenticated" ON public.opportunity_reviews;
CREATE POLICY "reviews_select_authenticated" ON public.opportunity_reviews
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own_attended" ON public.opportunity_reviews;
CREATE POLICY "reviews_insert_own_attended" ON public.opportunity_reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.feedback_attended(opportunity_id, auth.uid()));

DROP POLICY IF EXISTS "reviews_update_own_attended" ON public.opportunity_reviews;
CREATE POLICY "reviews_update_own_attended" ON public.opportunity_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.feedback_attended(opportunity_id, auth.uid()));

DROP POLICY IF EXISTS "reviews_delete_own" ON public.opportunity_reviews;
CREATE POLICY "reviews_delete_own" ON public.opportunity_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.opportunity_reviews FROM anon;

CREATE OR REPLACE FUNCTION public.opportunity_reviews_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.comment := NULLIF(btrim(NEW.comment), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS opportunity_reviews_touch ON public.opportunity_reviews;
CREATE TRIGGER opportunity_reviews_touch
  BEFORE INSERT OR UPDATE ON public.opportunity_reviews
  FOR EACH ROW EXECUTE FUNCTION public.opportunity_reviews_touch();

-- Rating RPCs
CREATE OR REPLACE FUNCTION public.get_opportunity_rating(p_opportunity_id uuid)
RETURNS TABLE (avg numeric, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)::bigint
  FROM public.opportunity_reviews
  WHERE opportunity_id = p_opportunity_id;
$$;

CREATE OR REPLACE FUNCTION public.get_org_rating(p_org_id uuid)
RETURNS TABLE (avg numeric, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ROUND(AVG(rv.rating)::numeric, 2), 0), COUNT(rv.id)::bigint
  FROM public.opportunity_reviews rv
  JOIN public.opportunities op ON op.id = rv.opportunity_id
  WHERE op.org_id = p_org_id;
$$;

REVOKE ALL ON FUNCTION public.get_opportunity_rating(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_org_rating(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_opportunity_rating(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_rating(uuid) TO authenticated;

-- Endorsements
CREATE TABLE IF NOT EXISTS public.volunteer_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_id uuid,
  text text NOT NULL CHECK (char_length(text) BETWEEN 10 AND 600 AND btrim(text) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS volunteer_endorsements_unique_idx
  ON public.volunteer_endorsements (volunteer_id, org_id, COALESCE(opportunity_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS volunteer_endorsements_volunteer_idx ON public.volunteer_endorsements (volunteer_id, created_at DESC);

ALTER TABLE public.volunteer_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "endorsements_select_authenticated" ON public.volunteer_endorsements;
CREATE POLICY "endorsements_select_authenticated" ON public.volunteer_endorsements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "endorsements_insert_org_owner" ON public.volunteer_endorsements;
CREATE POLICY "endorsements_insert_org_owner" ON public.volunteer_endorsements
  FOR INSERT TO authenticated
  WITH CHECK (public.feedback_can_endorse(volunteer_id, org_id, opportunity_id));

DROP POLICY IF EXISTS "endorsements_delete_org_owner" ON public.volunteer_endorsements;
CREATE POLICY "endorsements_delete_org_owner" ON public.volunteer_endorsements
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.user_id = auth.uid()));

REVOKE ALL ON public.volunteer_endorsements FROM anon;

COMMIT;

-- ===== 20260701000700_org_analytics =====
-- NGO analytics: read-only SECURITY DEFINER RPCs. Caller must own the org or be admin.
BEGIN;

CREATE INDEX IF NOT EXISTS idx_oa_vr_opportunity ON public.volunteer_registrations (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_oa_opp_org_date ON public.opportunities (org_id, date);

-- Internal authorization + range clamp helper (not exposed to clients).
CREATE OR REPLACE FUNCTION public.oa_authorize(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    public.is_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p_org_id AND o.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.oa_authorize(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.org_analytics_summary(
  p_org_id uuid,
  p_from date DEFAULT (current_date - 90),
  p_to date DEFAULT current_date
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from date;
  v_to date;
  v_result json;
BEGIN
  PERFORM public.oa_authorize(p_org_id);
  v_to := COALESCE(p_to, current_date);
  v_from := GREATEST(COALESCE(p_from, v_to - 90), v_to - 1095);

  WITH ops AS (
    SELECT op.id, op.date, op.max_volunteers
    FROM public.opportunities op
    WHERE op.org_id = p_org_id AND op.date BETWEEN v_from AND v_to
  ),
  regs AS (
    SELECT r.user_id, r.opportunity_id, COALESCE(r.attended, false) AS attended,
           COALESCE(r.hours_credited, 0) AS hours, ops.date AS op_date
    FROM public.volunteer_registrations r
    JOIN ops ON ops.id::text = r.opportunity_id::text
    WHERE COALESCE(r.status, '') NOT IN ('cancelled', 'rejected')
  ),
  per_op AS (
    SELECT ops.id, ops.max_volunteers, count(regs.user_id) AS registered
    FROM ops LEFT JOIN regs ON regs.opportunity_id::text = ops.id::text
    GROUP BY ops.id, ops.max_volunteers
  ),
  per_vol AS (
    SELECT user_id, count(DISTINCT opportunity_id::text) AS n FROM regs GROUP BY user_id
  )
  SELECT json_build_object(
    'opportunities', (SELECT count(*) FROM ops),
    'registrations', (SELECT count(*) FROM regs),
    'attended', (SELECT count(*) FROM regs WHERE attended),
    'no_show_rate', COALESCE((
      SELECT round(1 - (count(*) FILTER (WHERE attended))::numeric / NULLIF(count(*), 0), 4)
      FROM regs WHERE op_date < current_date
    ), 0),
    'verified_hours', (SELECT COALESCE(round(sum(hours)::numeric, 2), 0) FROM regs WHERE attended),
    'unique_volunteers', (SELECT count(*) FROM per_vol),
    'repeat_volunteers', (SELECT count(*) FROM per_vol WHERE n > 1),
    'avg_fill_rate', COALESCE((
      SELECT round(avg(LEAST(registered::numeric / max_volunteers, 1)), 4)
      FROM per_op WHERE max_volunteers IS NOT NULL AND max_volunteers > 0
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.org_analytics_timeseries(
  p_org_id uuid,
  p_from date DEFAULT (current_date - 90),
  p_to date DEFAULT current_date
)
RETURNS TABLE (week_start date, registrations bigint, attended bigint, hours numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from date;
  v_to date;
BEGIN
  PERFORM public.oa_authorize(p_org_id);
  v_to := COALESCE(p_to, current_date);
  v_from := GREATEST(COALESCE(p_from, v_to - 90), v_to - 1095);

  RETURN QUERY
  SELECT date_trunc('week', op.date::timestamp)::date AS week_start,
         count(r.id)::bigint AS registrations,
         (count(r.id) FILTER (WHERE COALESCE(r.attended, false)))::bigint AS attended,
         COALESCE(sum(COALESCE(r.hours_credited, 0)) FILTER (WHERE COALESCE(r.attended, false)), 0)::numeric AS hours
  FROM public.opportunities op
  JOIN public.volunteer_registrations r ON r.opportunity_id::text = op.id::text
  WHERE op.org_id = p_org_id
    AND op.date BETWEEN v_from AND v_to
    AND COALESCE(r.status, '') NOT IN ('cancelled', 'rejected')
  GROUP BY 1
  ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.org_analytics_by_opportunity(
  p_org_id uuid,
  p_from date DEFAULT (current_date - 90),
  p_to date DEFAULT current_date
)
RETURNS TABLE (
  opportunity_id uuid, title text, date date, category text,
  max_volunteers integer, registered bigint, attended bigint, hours numeric, fill_rate numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from date;
  v_to date;
BEGIN
  PERFORM public.oa_authorize(p_org_id);
  v_to := COALESCE(p_to, current_date);
  v_from := GREATEST(COALESCE(p_from, v_to - 90), v_to - 1095);

  RETURN QUERY
  SELECT op.id, op.title::text, op.date::date, op.category::text,
         op.max_volunteers::integer,
         count(r.id)::bigint,
         (count(r.id) FILTER (WHERE COALESCE(r.attended, false)))::bigint,
         COALESCE(sum(COALESCE(r.hours_credited, 0)) FILTER (WHERE COALESCE(r.attended, false)), 0)::numeric,
         CASE WHEN op.max_volunteers IS NOT NULL AND op.max_volunteers > 0
              THEN round(LEAST(count(r.id)::numeric / op.max_volunteers, 1), 4)
              ELSE 0 END::numeric
  FROM public.opportunities op
  LEFT JOIN public.volunteer_registrations r
    ON r.opportunity_id::text = op.id::text
   AND COALESCE(r.status, '') NOT IN ('cancelled', 'rejected')
  WHERE op.org_id = p_org_id AND op.date BETWEEN v_from AND v_to
  GROUP BY op.id, op.title, op.date, op.category, op.max_volunteers
  ORDER BY op.date DESC
  LIMIT 500;
END;
$$;

REVOKE ALL ON FUNCTION public.org_analytics_summary(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.org_analytics_timeseries(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.org_analytics_by_opportunity(uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_analytics_summary(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_analytics_timeseries(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_analytics_by_opportunity(uuid, date, date) TO authenticated;

COMMIT;

-- ===== 20260701000900_recurring_opportunities =====
-- Recurring opportunities: series table, opportunities.series_id, create/cancel RPCs.
BEGIN;

CREATE TABLE IF NOT EXISTS public.opportunity_series (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule        text NOT NULL CHECK (rule IN ('weekly', 'biweekly', 'monthly')),
  weekdays    smallint[] NOT NULL DEFAULT '{}',
  starts_on   date NOT NULL,
  ends_on     date,
  occurrences int NOT NULL CHECK (occurrences BETWEEN 2 AND 52),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_series_org ON public.opportunity_series (org_id);

ALTER TABLE public.opportunity_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org owners select own series" ON public.opportunity_series;
CREATE POLICY "Org owners select own series" ON public.opportunity_series
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = opportunity_series.org_id AND o.user_id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Org owners insert own series" ON public.opportunity_series;
CREATE POLICY "Org owners insert own series" ON public.opportunity_series
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = opportunity_series.org_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org owners update own series" ON public.opportunity_series;
CREATE POLICY "Org owners update own series" ON public.opportunity_series
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = opportunity_series.org_id AND o.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = opportunity_series.org_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Org owners delete own series" ON public.opportunity_series;
CREATE POLICY "Org owners delete own series" ON public.opportunity_series
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = opportunity_series.org_id AND o.user_id = auth.uid())
  );

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.opportunity_series(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_series_id ON public.opportunities (series_id) WHERE series_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- create_opportunity_series
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_opportunity_series(
  p_org_id uuid,
  p_template jsonb,
  p_rule text,
  p_starts_on date,
  p_occurrences int
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_series_id uuid;
  v_title     text;
  v_max       int;
  v_skills    text[];
  v_lat       double precision;
  v_lng       double precision;
  v_date      date;
  v_new_id    uuid;
  v_ids       uuid[] := '{}';
  i           int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p_org_id AND o.user_id = v_uid) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  IF p_rule IS NULL OR p_rule NOT IN ('weekly', 'biweekly', 'monthly') THEN
    RAISE EXCEPTION 'Invalid recurrence rule';
  END IF;
  IF p_starts_on IS NULL THEN
    RAISE EXCEPTION 'Start date is required';
  END IF;
  IF p_occurrences IS NULL OR p_occurrences < 2 OR p_occurrences > 52 THEN
    RAISE EXCEPTION 'Occurrences must be between 2 and 52';
  END IF;
  IF p_template IS NULL OR jsonb_typeof(p_template) <> 'object' THEN
    RAISE EXCEPTION 'Invalid template';
  END IF;

  v_title := btrim(coalesce(p_template ->> 'title', ''));
  IF v_title = '' OR char_length(v_title) > 200 THEN
    RAISE EXCEPTION 'Title is required and must be at most 200 characters';
  END IF;
  IF char_length(coalesce(p_template ->> 'description', '')) > 5000 THEN
    RAISE EXCEPTION 'Description too long';
  END IF;

  BEGIN
    v_max := coalesce(nullif(p_template ->> 'max_volunteers', '')::int, 50);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Invalid max_volunteers';
  END;
  IF v_max < 1 OR v_max > 10000 THEN
    RAISE EXCEPTION 'max_volunteers must be between 1 and 10000';
  END IF;

  IF jsonb_typeof(p_template -> 'skills_needed') = 'array' THEN
    SELECT coalesce(array_agg(left(s, 100)), '{}')
      INTO v_skills
      FROM (
        SELECT jsonb_array_elements_text(p_template -> 'skills_needed') AS s
        LIMIT 50
      ) q;
  ELSE
    v_skills := '{}';
  END IF;

  BEGIN
    v_lat := nullif(p_template ->> 'latitude', '')::double precision;
    v_lng := nullif(p_template ->> 'longitude', '')::double precision;
  EXCEPTION WHEN others THEN
    v_lat := NULL;
    v_lng := NULL;
  END;
  IF v_lat IS NOT NULL AND (v_lat < -90 OR v_lat > 90) THEN v_lat := NULL; v_lng := NULL; END IF;
  IF v_lng IS NOT NULL AND (v_lng < -180 OR v_lng > 180) THEN v_lat := NULL; v_lng := NULL; END IF;

  INSERT INTO public.opportunity_series (org_id, rule, starts_on, ends_on, occurrences)
  VALUES (
    p_org_id, p_rule, p_starts_on,
    CASE p_rule
      WHEN 'weekly'   THEN p_starts_on + ((p_occurrences - 1) * 7)
      WHEN 'biweekly' THEN p_starts_on + ((p_occurrences - 1) * 14)
      ELSE (p_starts_on + ((p_occurrences - 1) * interval '1 month'))::date
    END,
    p_occurrences
  )
  RETURNING id INTO v_series_id;

  FOR i IN 0 .. p_occurrences - 1 LOOP
    v_date := CASE p_rule
      WHEN 'weekly'   THEN p_starts_on + (i * 7)
      WHEN 'biweekly' THEN p_starts_on + (i * 14)
      ELSE (p_starts_on + (i * interval '1 month'))::date
    END;

    INSERT INTO public.opportunities (
      id, org_id, series_id, title, description, category, skills_needed, date,
      start_time, end_time, location, city, max_volunteers, time_commitment,
      latitude, longitude
    ) VALUES (
      gen_random_uuid(), p_org_id, v_series_id, v_title,
      coalesce(p_template ->> 'description', ''),
      coalesce(nullif(p_template ->> 'category', ''), 'General'),
      v_skills, v_date,
      coalesce(nullif(p_template ->> 'start_time', ''), '09:00')::time,
      coalesce(nullif(p_template ->> 'end_time', ''), '17:00')::time,
      left(coalesce(p_template ->> 'location', ''), 300),
      left(coalesce(nullif(p_template ->> 'city', ''), 'Mumbai'), 100),
      v_max,
      coalesce(nullif(p_template ->> 'time_commitment', ''), 'Half Day'),
      v_lat, v_lng
    )
    RETURNING id INTO v_new_id;

    v_ids := v_ids || v_new_id;
  END LOOP;

  RETURN to_json(v_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.create_opportunity_series(uuid, jsonb, text, date, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_opportunity_series(uuid, jsonb, text, date, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- cancel_opportunity_series
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_opportunity_series(
  p_series_id uuid,
  p_from date DEFAULT current_date
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_deleted int := 0;
  v_cancelled int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT s.org_id INTO v_org
    FROM public.opportunity_series s
    JOIN public.organizations o ON o.id = s.org_id
   WHERE s.id = p_series_id AND o.user_id = v_uid;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;

  -- Future occurrences that have registrations are kept but cancelled.
  UPDATE public.opportunities op
     SET status = 'cancelled'
   WHERE op.series_id = p_series_id
     AND op.date >= coalesce(p_from, current_date)
     AND EXISTS (
       SELECT 1 FROM public.volunteer_registrations r WHERE r.opportunity_id::text = op.id::text
     );
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  -- Future occurrences without registrations are removed.
  DELETE FROM public.opportunities op
   WHERE op.series_id = p_series_id
     AND op.date >= coalesce(p_from, current_date)
     AND NOT EXISTS (
       SELECT 1 FROM public.volunteer_registrations r WHERE r.opportunity_id::text = op.id::text
     );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN json_build_object('deleted', v_deleted, 'cancelled', v_cancelled);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_opportunity_series(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_opportunity_series(uuid, date) TO authenticated;

COMMIT;

-- ===== 20260701001000_announcements =====
-- Org announcements to registered volunteers (event updates).
-- Optional hook (not installed here): an AFTER INSERT trigger on
-- public.opportunity_announcements may call the notification function to
-- notify registered volunteers; the lead can add it once that table exists.
BEGIN;

CREATE TABLE IF NOT EXISTS public.opportunity_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opp_announcements_opp
  ON public.opportunity_announcements (opportunity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opp_announcements_org
  ON public.opportunity_announcements (org_id, created_at DESC);

ALTER TABLE public.opportunity_announcements ENABLE ROW LEVEL SECURITY;

-- Helpers (SECURITY DEFINER to avoid RLS recursion).
CREATE OR REPLACE FUNCTION public.ann_is_opportunity_owner(p_opportunity uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = p_opportunity AND o.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.ann_can_view(p_opportunity uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin(auth.uid())
    OR public.ann_is_opportunity_owner(p_opportunity)
    OR EXISTS (
      SELECT 1 FROM public.volunteer_registrations r
      WHERE r.opportunity_id::text = p_opportunity::text
        AND r.user_id = auth.uid()
    )
  );
$$;

-- Does the org own this opportunity AND is the caller the org owner?
CREATE OR REPLACE FUNCTION public.ann_owner_matches(p_opportunity uuid, p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = p_opportunity AND op.org_id = p_org AND o.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.ann_is_opportunity_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ann_can_view(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ann_owner_matches(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ann_is_opportunity_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ann_can_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ann_owner_matches(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS ann_select ON public.opportunity_announcements;
CREATE POLICY ann_select ON public.opportunity_announcements
  FOR SELECT TO authenticated
  USING (public.ann_can_view(opportunity_id));

DROP POLICY IF EXISTS ann_insert ON public.opportunity_announcements;
CREATE POLICY ann_insert ON public.opportunity_announcements
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.ann_owner_matches(opportunity_id, org_id));

DROP POLICY IF EXISTS ann_update ON public.opportunity_announcements;
CREATE POLICY ann_update ON public.opportunity_announcements
  FOR UPDATE TO authenticated
  USING (public.ann_owner_matches(opportunity_id, org_id))
  WITH CHECK (public.ann_owner_matches(opportunity_id, org_id));

DROP POLICY IF EXISTS ann_delete ON public.opportunity_announcements;
CREATE POLICY ann_delete ON public.opportunity_announcements
  FOR DELETE TO authenticated
  USING (public.ann_owner_matches(opportunity_id, org_id));

REVOKE ALL ON public.opportunity_announcements FROM anon;

-- Rate limit: max 10 announcements per org per hour.
CREATE OR REPLACE FUNCTION public.ann_rate_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.opportunity_announcements a
      WHERE a.org_id = NEW.org_id AND a.created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Announcement rate limit reached (10 per hour)' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ann_rate_limit() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS ann_rate_limit_trg ON public.opportunity_announcements;
CREATE TRIGGER ann_rate_limit_trg
  BEFORE INSERT ON public.opportunity_announcements
  FOR EACH ROW EXECUTE FUNCTION public.ann_rate_limit();

-- Feed across all opportunities the caller is registered for.
CREATE OR REPLACE FUNCTION public.get_my_announcements(p_limit int DEFAULT 30)
RETURNS TABLE (
  id uuid,
  opportunity_id uuid,
  opportunity_title text,
  org_id uuid,
  title text,
  body text,
  pinned boolean,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.opportunity_id, op.title, a.org_id, a.title, a.body, a.pinned, a.created_at
  FROM public.opportunity_announcements a
  JOIN public.opportunities op ON op.id = a.opportunity_id
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.volunteer_registrations r
      WHERE r.opportunity_id::text = a.opportunity_id::text
        AND r.user_id = auth.uid()
    )
  ORDER BY a.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;
REVOKE ALL ON FUNCTION public.get_my_announcements(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_announcements(int) TO authenticated;

COMMIT;

-- ===== 20260701001100_certificates =====
-- Verifiable impact certificates with public verification.
BEGIN;

CREATE TABLE IF NOT EXISTS public.impact_certificates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,
  user_id        uuid NOT NULL,
  volunteer_name text,
  total_hours    numeric NOT NULL DEFAULT 0,
  events_count   int NOT NULL DEFAULT 0,
  causes         text[] NOT NULL DEFAULT '{}',
  period_start   date,
  period_end     date,
  issued_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  revoked_reason text
);
CREATE INDEX IF NOT EXISTS idx_impact_certificates_user ON public.impact_certificates(user_id, issued_at DESC);

ALTER TABLE public.impact_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own certificates" ON public.impact_certificates;
CREATE POLICY "Owner reads own certificates" ON public.impact_certificates
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all certificates" ON public.impact_certificates;
CREATE POLICY "Admins read all certificates" ON public.impact_certificates
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- No insert/update/delete policies: writes happen only through SECURITY DEFINER RPCs.
REVOKE ALL ON public.impact_certificates FROM anon, authenticated;
GRANT SELECT ON public.impact_certificates TO authenticated;

-- 12-char code from an unambiguous alphabet (no 0/O/1/I/L).
CREATE OR REPLACE FUNCTION public._gen_certificate_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text;
  bytes bytea;
  i int;
BEGIN
  LOOP
    result := '';
    bytes := uuid_send(gen_random_uuid());
    FOR i IN 0..11 LOOP
      result := result || substr(alphabet, (get_byte(bytes, i + 2) % length(alphabet)) + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.impact_certificates WHERE code = result);
  END LOOP;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public._gen_certificate_code() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.issue_my_certificate(p_from date DEFAULT NULL, p_to date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_hours numeric;
  v_events int;
  v_causes text[];
  v_name text;
  v_row public.impact_certificates;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_from > p_to THEN
    RAISE EXCEPTION 'Invalid period' USING ERRCODE = '22023';
  END IF;

  -- Serialize per user so the rate limit cannot be raced.
  PERFORM pg_advisory_xact_lock(hashtextextended('issue_cert:' || uid::text, 0));

  IF (SELECT count(*) FROM public.impact_certificates
       WHERE user_id = uid AND issued_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'Certificate limit reached (5 per day)' USING ERRCODE = '54000';
  END IF;

  SELECT COALESCE(sum(r.hours_credited), 0),
         count(*)::int,
         COALESCE(array_agg(DISTINCT o.category) FILTER (WHERE o.category IS NOT NULL AND o.category <> ''), '{}')
    INTO v_hours, v_events, v_causes
    FROM public.volunteer_registrations r
    JOIN public.opportunities o ON o.id::text = r.opportunity_id::text
   WHERE r.user_id = uid
     AND r.attended IS TRUE
     AND COALESCE(r.hours_credited, 0) > 0
     AND (p_from IS NULL OR o.date::date >= p_from)
     AND (p_to IS NULL OR o.date::date <= p_to);

  IF v_hours <= 0 THEN
    RAISE EXCEPTION 'No verified volunteer hours in this period' USING ERRCODE = 'P0002';
  END IF;

  SELECT NULLIF(btrim(full_name), '') INTO v_name FROM public.profiles WHERE user_id = uid;

  INSERT INTO public.impact_certificates
    (code, user_id, volunteer_name, total_hours, events_count, causes, period_start, period_end)
  VALUES
    (public._gen_certificate_code(), uid, COALESCE(v_name, 'Volunteer'), v_hours, v_events, v_causes, p_from, p_to)
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END $$;
REVOKE ALL ON FUNCTION public.issue_my_certificate(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_my_certificate(date, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_certificate(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.impact_certificates;
  v_code text := upper(regexp_replace(COALESCE(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  first_name text;
  last_name text;
  masked text;
BEGIN
  IF length(v_code) <> 12 THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT * INTO c FROM public.impact_certificates WHERE code = v_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  first_name := split_part(btrim(COALESCE(c.volunteer_name, 'Volunteer')), ' ', 1);
  last_name := regexp_replace(btrim(COALESCE(c.volunteer_name, '')), '^.*\s', '');
  IF last_name <> '' AND last_name <> first_name THEN
    masked := first_name || ' ' || upper(left(last_name, 1)) || '.';
  ELSE
    masked := first_name;
  END IF;

  RETURN jsonb_build_object(
    'valid', c.revoked_at IS NULL,
    'revoked', c.revoked_at IS NOT NULL,
    'volunteer_name', masked,
    'total_hours', c.total_hours,
    'events_count', c.events_count,
    'causes', to_jsonb(c.causes),
    'period_start', c.period_start,
    'period_end', c.period_end,
    'issued_at', c.issued_at
  );
END $$;
REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_certificate(p_code text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := upper(regexp_replace(COALESCE(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  UPDATE public.impact_certificates
     SET revoked_at = now(), revoked_reason = left(NULLIF(btrim(p_reason), ''), 500)
   WHERE code = v_code AND revoked_at IS NULL
   RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Certificate not found or already revoked' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'revoke_certificate', 'certificate', v_id::text,
          jsonb_build_object('code', v_code, 'reason', left(COALESCE(p_reason, ''), 500)));
END $$;
REVOKE ALL ON FUNCTION public.admin_revoke_certificate(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_certificate(text, text) TO authenticated;

COMMIT;
