
-- Create user_tasks table
CREATE TABLE public.user_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  period TEXT NOT NULL DEFAULT 'today',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own tasks" ON public.user_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.user_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.user_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.user_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create user_events table
CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  day INTEGER NOT NULL DEFAULT 0,
  start_hour INTEGER NOT NULL,
  start_min INTEGER NOT NULL DEFAULT 0,
  end_hour INTEGER NOT NULL,
  end_min INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT 'text-sky-300',
  bg TEXT NOT NULL DEFAULT 'bg-sky-500/15',
  border TEXT NOT NULL DEFAULT 'border-l-sky-400',
  icon_name TEXT NOT NULL DEFAULT 'Users',
  badge TEXT,
  category TEXT NOT NULL DEFAULT 'Personal Calendar',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own events" ON public.user_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.user_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.user_events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.user_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
