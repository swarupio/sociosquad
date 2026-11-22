-- DB-6: public leaderboard without exposing user_stats / emails / ids.
-- user_stats SELECT stays own-row only; this RPC returns only what the UI needs.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE(display_name text, avatar_url text, xp int, total_hours int, level int, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT COALESCE(NULLIF(trim(p.full_name), ''), 'Volunteer') AS display_name,
         p.avatar_url, s.xp, s.total_hours, s.level,
         (s.user_id = auth.uid()) AS is_me
  FROM public.user_stats s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  ORDER BY s.xp DESC, s.total_hours DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 100))
$$;
REVOKE ALL ON FUNCTION public.get_leaderboard(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO authenticated;
COMMIT;
