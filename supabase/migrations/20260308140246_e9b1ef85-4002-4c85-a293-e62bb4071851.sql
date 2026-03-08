
-- Add new ISO timestamp columns
ALTER TABLE public.user_events ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.user_events ADD COLUMN IF NOT EXISTS end_time TEXT;

-- Migrate existing data: construct ISO strings from old columns
-- Using a fixed date base (2026-03-09 is a Monday) + day offset
UPDATE public.user_events
SET start_time = TO_CHAR(
  ('2026-03-09'::date + (day * INTERVAL '1 day') + (start_hour * INTERVAL '1 hour') + (start_min * INTERVAL '1 minute')),
  'YYYY-MM-DD"T"HH24:MI:SS'
),
end_time = TO_CHAR(
  ('2026-03-09'::date + (day * INTERVAL '1 day') + (end_hour * INTERVAL '1 hour') + (end_min * INTERVAL '1 minute')),
  'YYYY-MM-DD"T"HH24:MI:SS'
)
WHERE start_time IS NULL;

-- Drop old columns
ALTER TABLE public.user_events DROP COLUMN IF EXISTS day;
ALTER TABLE public.user_events DROP COLUMN IF EXISTS start_hour;
ALTER TABLE public.user_events DROP COLUMN IF EXISTS start_min;
ALTER TABLE public.user_events DROP COLUMN IF EXISTS end_hour;
ALTER TABLE public.user_events DROP COLUMN IF EXISTS end_min;

-- Make new columns NOT NULL with defaults
ALTER TABLE public.user_events ALTER COLUMN start_time SET NOT NULL;
ALTER TABLE public.user_events ALTER COLUMN start_time SET DEFAULT '';
ALTER TABLE public.user_events ALTER COLUMN end_time SET NOT NULL;
ALTER TABLE public.user_events ALTER COLUMN end_time SET DEFAULT '';
