
-- Add a 'category' column to squad_challenges to map to activity types
ALTER TABLE public.squad_challenges ADD COLUMN category TEXT NOT NULL DEFAULT 'all';

-- Create a function that auto-calculates challenge progress from squad members' activities
CREATE OR REPLACE FUNCTION public.get_challenge_progress(challenge_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT 
        CASE 
          WHEN sc.unit = 'hours' THEN 
            (SELECT COALESCE(SUM(us.total_hours), 0) FROM user_stats us 
             INNER JOIN squad_members sm ON sm.user_id = us.user_id 
             WHERE sm.squad_id = sc.squad_id)
          WHEN sc.unit = 'tasks' THEN 
            (SELECT COALESCE(SUM(us.tasks_completed), 0) FROM user_stats us 
             INNER JOIN squad_members sm ON sm.user_id = us.user_id 
             WHERE sm.squad_id = sc.squad_id)
          ELSE 
            (SELECT COALESCE(COUNT(*), 0) FROM user_activities ua 
             INNER JOIN squad_members sm ON sm.user_id = ua.user_id 
             WHERE sm.squad_id = sc.squad_id
             AND ua.created_at >= sc.created_at)
        END
      FROM squad_challenges sc WHERE sc.id = challenge_id
    ), 0
  )::INTEGER;
$$;

-- Create a function to get per-member contributions for a challenge
CREATE OR REPLACE FUNCTION public.get_member_contributions(p_squad_id UUID, p_unit TEXT, p_since TIMESTAMPTZ DEFAULT '1970-01-01')
RETURNS TABLE(user_id UUID, contribution BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sm.user_id,
    CASE 
      WHEN p_unit = 'hours' THEN COALESCE((SELECT us.total_hours FROM user_stats us WHERE us.user_id = sm.user_id), 0)::BIGINT
      WHEN p_unit = 'tasks' THEN COALESCE((SELECT us.tasks_completed FROM user_stats us WHERE us.user_id = sm.user_id), 0)::BIGINT
      ELSE COALESCE((SELECT COUNT(*) FROM user_activities ua WHERE ua.user_id = sm.user_id AND ua.created_at >= p_since), 0)::BIGINT
    END as contribution
  FROM squad_members sm
  WHERE sm.squad_id = p_squad_id;
$$;
