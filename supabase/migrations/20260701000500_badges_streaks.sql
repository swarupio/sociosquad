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
