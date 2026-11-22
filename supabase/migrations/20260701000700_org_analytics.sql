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
