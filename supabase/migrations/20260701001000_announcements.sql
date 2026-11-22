-- Org announcements to registered volunteers (event updates).
-- Optional hook (not installed here): an AFTER INSERT trigger on
-- public.opportunity_announcements may call the notification function to
-- notify registered volunteers; the lead can add it once that table exists.
BEGIN;

CREATE TABLE IF NOT EXISTS public.opportunity_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opp_announcements_opp
  ON public.opportunity_announcements (opportunity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opp_announcements_org
  ON public.opportunity_announcements (org_id, created_at DESC);

ALTER TABLE public.opportunity_announcements ENABLE ROW LEVEL SECURITY;

-- Helpers (SECURITY DEFINER to avoid RLS recursion).
CREATE OR REPLACE FUNCTION public.ann_is_opportunity_owner(p_opportunity uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = p_opportunity AND o.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.ann_can_view(p_opportunity uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin(auth.uid())
    OR public.ann_is_opportunity_owner(p_opportunity)
    OR EXISTS (
      SELECT 1 FROM public.volunteer_registrations r
      WHERE r.opportunity_id::text = p_opportunity::text
        AND r.user_id = auth.uid()
    )
  );
$$;

-- Does the org own this opportunity AND is the caller the org owner?
CREATE OR REPLACE FUNCTION public.ann_owner_matches(p_opportunity uuid, p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.opportunities op
    JOIN public.organizations o ON o.id = op.org_id
    WHERE op.id = p_opportunity AND op.org_id = p_org AND o.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.ann_is_opportunity_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ann_can_view(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ann_owner_matches(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ann_is_opportunity_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ann_can_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ann_owner_matches(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS ann_select ON public.opportunity_announcements;
CREATE POLICY ann_select ON public.opportunity_announcements
  FOR SELECT TO authenticated
  USING (public.ann_can_view(opportunity_id));

DROP POLICY IF EXISTS ann_insert ON public.opportunity_announcements;
CREATE POLICY ann_insert ON public.opportunity_announcements
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.ann_owner_matches(opportunity_id, org_id));

DROP POLICY IF EXISTS ann_update ON public.opportunity_announcements;
CREATE POLICY ann_update ON public.opportunity_announcements
  FOR UPDATE TO authenticated
  USING (public.ann_owner_matches(opportunity_id, org_id))
  WITH CHECK (public.ann_owner_matches(opportunity_id, org_id));

DROP POLICY IF EXISTS ann_delete ON public.opportunity_announcements;
CREATE POLICY ann_delete ON public.opportunity_announcements
  FOR DELETE TO authenticated
  USING (public.ann_owner_matches(opportunity_id, org_id));

REVOKE ALL ON public.opportunity_announcements FROM anon;

-- Rate limit: max 10 announcements per org per hour.
CREATE OR REPLACE FUNCTION public.ann_rate_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.opportunity_announcements a
      WHERE a.org_id = NEW.org_id AND a.created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Announcement rate limit reached (10 per hour)' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ann_rate_limit() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS ann_rate_limit_trg ON public.opportunity_announcements;
CREATE TRIGGER ann_rate_limit_trg
  BEFORE INSERT ON public.opportunity_announcements
  FOR EACH ROW EXECUTE FUNCTION public.ann_rate_limit();

-- Feed across all opportunities the caller is registered for.
CREATE OR REPLACE FUNCTION public.get_my_announcements(p_limit int DEFAULT 30)
RETURNS TABLE (
  id uuid,
  opportunity_id uuid,
  opportunity_title text,
  org_id uuid,
  title text,
  body text,
  pinned boolean,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.opportunity_id, op.title, a.org_id, a.title, a.body, a.pinned, a.created_at
  FROM public.opportunity_announcements a
  JOIN public.opportunities op ON op.id = a.opportunity_id
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.volunteer_registrations r
      WHERE r.opportunity_id::text = a.opportunity_id::text
        AND r.user_id = auth.uid()
    )
  ORDER BY a.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;
REVOKE ALL ON FUNCTION public.get_my_announcements(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_announcements(int) TO authenticated;

COMMIT;
