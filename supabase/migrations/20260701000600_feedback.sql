BEGIN;

-- Helper: has this user an attended registration for the opportunity?
CREATE OR REPLACE FUNCTION public.feedback_attended(p_opportunity_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.volunteer_registrations r
    WHERE r.opportunity_id::text = p_opportunity_id::text
      AND r.user_id = p_user_id
      AND r.attended IS TRUE
  );
$$;

-- Helper: may this org (owned by caller) endorse this volunteer?
CREATE OR REPLACE FUNCTION public.feedback_can_endorse(p_volunteer_id uuid, p_org_id uuid, p_opportunity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN public.opportunities op ON op.org_id = o.id
    JOIN public.volunteer_registrations r ON r.opportunity_id::text = op.id::text
    WHERE o.id = p_org_id
      AND o.user_id = auth.uid()
      AND r.user_id = p_volunteer_id
      AND r.attended IS TRUE
      AND (p_opportunity_id IS NULL OR op.id = p_opportunity_id)
  );
$$;

REVOKE ALL ON FUNCTION public.feedback_attended(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.feedback_can_endorse(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feedback_attended(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feedback_can_endorse(uuid, uuid, uuid) TO authenticated;

-- Reviews
CREATE TABLE IF NOT EXISTS public.opportunity_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, user_id)
);
CREATE INDEX IF NOT EXISTS opportunity_reviews_opp_idx ON public.opportunity_reviews (opportunity_id, created_at DESC);

ALTER TABLE public.opportunity_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_authenticated" ON public.opportunity_reviews;
CREATE POLICY "reviews_select_authenticated" ON public.opportunity_reviews
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own_attended" ON public.opportunity_reviews;
CREATE POLICY "reviews_insert_own_attended" ON public.opportunity_reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.feedback_attended(opportunity_id, auth.uid()));

DROP POLICY IF EXISTS "reviews_update_own_attended" ON public.opportunity_reviews;
CREATE POLICY "reviews_update_own_attended" ON public.opportunity_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND public.feedback_attended(opportunity_id, auth.uid()));

DROP POLICY IF EXISTS "reviews_delete_own" ON public.opportunity_reviews;
CREATE POLICY "reviews_delete_own" ON public.opportunity_reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.opportunity_reviews FROM anon;

CREATE OR REPLACE FUNCTION public.opportunity_reviews_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.comment := NULLIF(btrim(NEW.comment), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS opportunity_reviews_touch ON public.opportunity_reviews;
CREATE TRIGGER opportunity_reviews_touch
  BEFORE INSERT OR UPDATE ON public.opportunity_reviews
  FOR EACH ROW EXECUTE FUNCTION public.opportunity_reviews_touch();

-- Rating RPCs
CREATE OR REPLACE FUNCTION public.get_opportunity_rating(p_opportunity_id uuid)
RETURNS TABLE (avg numeric, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0), COUNT(*)::bigint
  FROM public.opportunity_reviews
  WHERE opportunity_id = p_opportunity_id;
$$;

CREATE OR REPLACE FUNCTION public.get_org_rating(p_org_id uuid)
RETURNS TABLE (avg numeric, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ROUND(AVG(rv.rating)::numeric, 2), 0), COUNT(rv.id)::bigint
  FROM public.opportunity_reviews rv
  JOIN public.opportunities op ON op.id = rv.opportunity_id
  WHERE op.org_id = p_org_id;
$$;

REVOKE ALL ON FUNCTION public.get_opportunity_rating(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_org_rating(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_opportunity_rating(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_rating(uuid) TO authenticated;

-- Endorsements
CREATE TABLE IF NOT EXISTS public.volunteer_endorsements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_id uuid,
  text text NOT NULL CHECK (char_length(text) BETWEEN 10 AND 600 AND btrim(text) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS volunteer_endorsements_unique_idx
  ON public.volunteer_endorsements (volunteer_id, org_id, COALESCE(opportunity_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS volunteer_endorsements_volunteer_idx ON public.volunteer_endorsements (volunteer_id, created_at DESC);

ALTER TABLE public.volunteer_endorsements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "endorsements_select_authenticated" ON public.volunteer_endorsements;
CREATE POLICY "endorsements_select_authenticated" ON public.volunteer_endorsements
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "endorsements_insert_org_owner" ON public.volunteer_endorsements;
CREATE POLICY "endorsements_insert_org_owner" ON public.volunteer_endorsements
  FOR INSERT TO authenticated
  WITH CHECK (public.feedback_can_endorse(volunteer_id, org_id, opportunity_id));

DROP POLICY IF EXISTS "endorsements_delete_org_owner" ON public.volunteer_endorsements;
CREATE POLICY "endorsements_delete_org_owner" ON public.volunteer_endorsements
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.user_id = auth.uid()));

REVOKE ALL ON public.volunteer_endorsements FROM anon;

COMMIT;
