
-- Table for user-specific dashboard stats
CREATE TABLE public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_hours integer NOT NULL DEFAULT 0,
  tasks_completed integer NOT NULL DEFAULT 0,
  day_streak integer NOT NULL DEFAULT 0,
  impact_score integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  xp_max integer NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stats" ON public.user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.user_stats FOR UPDATE USING (auth.uid() = user_id);

-- Table for user activity feed
CREATE TABLE public.user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target text NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON public.user_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activities" ON public.user_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create stats on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, total_hours, tasks_completed, day_streak, impact_score, level, xp, xp_max)
  VALUES (NEW.id, 0, 0, 0, 0, 1, 0, 500);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_stats();
