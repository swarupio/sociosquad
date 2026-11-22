-- Notifications center: inbox table, RPCs, registration triggers, realtime.
BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('reminder','registration','verification','announcement','badge','waitlist','system')),
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_link_relative CHECK (link IS NULL OR (link LIKE '/%' AND link NOT LIKE '//%'))
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- No INSERT / UPDATE policies: writes go through SECURITY DEFINER functions only.
REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT, UPDATE ON public.notifications FROM authenticated;
GRANT SELECT, DELETE ON public.notifications TO authenticated;

-- Server-internal: create a notification.
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user uuid, p_type text, p_title text, p_body text DEFAULT NULL, p_link text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_user IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (p_user, p_type, left(p_title, 200), left(p_body, 1000),
          CASE WHEN p_link LIKE '/%' AND p_link NOT LIKE '//%' THEN p_link ELSE NULL END)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Client: mark own notifications read (null = all).
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.notifications
     SET read_at = now()
   WHERE user_id = auth.uid()
     AND read_at IS NULL
     AND (p_ids IS NULL OR id = ANY (p_ids));
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) TO authenticated;

-- Retention helper (server/cron only).
CREATE OR REPLACE FUNCTION public.purge_old_notifications(p_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.notifications
   WHERE created_at < now() - make_interval(days => GREATEST(p_days, 7))
     AND read_at IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.purge_old_notifications(integer) FROM PUBLIC, anon, authenticated;

-- Trigger: registration created.
CREATE OR REPLACE FUNCTION public.ntf_registration_created()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  SELECT op.title INTO v_title FROM public.opportunities op
   WHERE op.id::text = NEW.opportunity_id::text;
  PERFORM public.notify_user(
    NEW.user_id, 'registration',
    'You''re registered for ' || COALESCE(v_title, 'an opportunity'),
    'See the details in your schedule.',
    '/schedule');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never block a registration because of a notification
END $$;
REVOKE ALL ON FUNCTION public.ntf_registration_created() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ntf_registration_created_trg ON public.volunteer_registrations;
CREATE TRIGGER ntf_registration_created_trg
  AFTER INSERT ON public.volunteer_registrations
  FOR EACH ROW EXECUTE FUNCTION public.ntf_registration_created();

-- Trigger: attendance verified / hours credited.
CREATE OR REPLACE FUNCTION public.ntf_registration_verified()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title text;
BEGIN
  IF (NEW.attended IS TRUE AND OLD.attended IS DISTINCT FROM TRUE)
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'verified') THEN
    SELECT op.title INTO v_title FROM public.opportunities op
     WHERE op.id::text = NEW.opportunity_id::text;
    PERFORM public.notify_user(
      NEW.user_id, 'verification',
      'Your participation was verified',
      COALESCE(v_title, 'An opportunity') ||
        CASE WHEN COALESCE(NEW.hours_credited, 0) > 0
             THEN ': ' || NEW.hours_credited::text || ' hours credited.'
             ELSE ': thank you for volunteering!' END,
      '/dashboard');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.ntf_registration_verified() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ntf_registration_verified_trg ON public.volunteer_registrations;
CREATE TRIGGER ntf_registration_verified_trg
  AFTER UPDATE ON public.volunteer_registrations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.attended IS DISTINCT FROM NEW.attended)
  EXECUTE FUNCTION public.ntf_registration_verified();

-- Realtime publication (guarded).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

COMMIT;
