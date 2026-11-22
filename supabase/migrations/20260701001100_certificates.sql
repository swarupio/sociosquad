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
