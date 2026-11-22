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
