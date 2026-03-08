
-- Activity submissions that need leader approval
CREATE TABLE public.squad_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.squad_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  value INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.squad_activity_logs ENABLE ROW LEVEL SECURITY;

-- Members can view all logs in their squads
CREATE POLICY "Members can view squad logs" ON public.squad_activity_logs
  FOR SELECT TO authenticated USING (true);

-- Members can submit their own logs
CREATE POLICY "Members can submit logs" ON public.squad_activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Leaders can update logs (approve/reject) - using security definer function
CREATE OR REPLACE FUNCTION public.is_squad_leader(p_user_id UUID, p_squad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM squad_members
    WHERE user_id = p_user_id AND squad_id = p_squad_id AND role = 'leader'
  );
$$;

CREATE POLICY "Leaders can update logs" ON public.squad_activity_logs
  FOR UPDATE TO authenticated
  USING (public.is_squad_leader(auth.uid(), squad_id));

-- Update the challenge progress function to only count APPROVED activities
CREATE OR REPLACE FUNCTION public.get_challenge_progress(challenge_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT SUM(sal.value) FROM squad_activity_logs sal
     WHERE sal.challenge_id = get_challenge_progress.challenge_id
     AND sal.status = 'approved'),
    0
  )::INTEGER;
$$;

-- Update member contributions to only count approved logs
CREATE OR REPLACE FUNCTION public.get_member_contributions(p_squad_id UUID, p_unit TEXT, p_since TIMESTAMPTZ DEFAULT '1970-01-01')
RETURNS TABLE(user_id UUID, contribution BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sm.user_id,
    COALESCE(
      (SELECT SUM(sal.value) FROM squad_activity_logs sal
       WHERE sal.user_id = sm.user_id
       AND sal.squad_id = p_squad_id
       AND sal.status = 'approved'
       AND sal.created_at >= p_since),
      0
    )::BIGINT as contribution
  FROM squad_members sm
  WHERE sm.squad_id = p_squad_id;
$$;
