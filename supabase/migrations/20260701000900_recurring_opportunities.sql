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
