-- Additive, idempotent indexes for the hot read paths after the query rewrite.
-- Safe to apply at any time; not applied automatically.
BEGIN;
-- "My registrations": WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_vr_user_created ON public.volunteer_registrations(user_id, created_at DESC);
-- NGO dashboard: WHERE org_id = ? ORDER BY date
CREATE INDEX IF NOT EXISTS idx_opps_org_date ON public.opportunities(org_id, date);
-- Static-opportunity registration lookups: WHERE user_id = ? AND registered = true
CREATE INDEX IF NOT EXISTS idx_ue_user_registered ON public.user_events(user_id) WHERE registered;
-- Org verification queue / public listing of verified orgs
CREATE INDEX IF NOT EXISTS idx_org_verified ON public.organizations(verified) WHERE verified;
COMMIT;
