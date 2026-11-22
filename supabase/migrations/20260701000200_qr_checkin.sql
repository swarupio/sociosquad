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
