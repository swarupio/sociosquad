
-- Squads table
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  invite_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  avatar_emoji TEXT NOT NULL DEFAULT '🌍',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(invite_code)
);

-- Squad members table
CREATE TABLE public.squad_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id)
);

-- Squad challenges table
CREATE TABLE public.squad_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  target_value INTEGER NOT NULL DEFAULT 100,
  current_value INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'hours',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_challenges ENABLE ROW LEVEL SECURITY;

-- Squads policies: anyone authenticated can see squads, creator can update/delete
CREATE POLICY "Anyone can view squads" ON public.squads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create squads" ON public.squads FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update squad" ON public.squads FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator can delete squad" ON public.squads FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Squad members policies
CREATE POLICY "Anyone can view squad members" ON public.squad_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can join squads" ON public.squad_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave squads" ON public.squad_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Squad challenges policies
CREATE POLICY "Members can view challenges" ON public.squad_challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can create challenges" ON public.squad_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update challenges" ON public.squad_challenges FOR UPDATE TO authenticated USING (auth.uid() = created_by);
