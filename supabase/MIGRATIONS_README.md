# Migrations 20260601* (security, admin, indexes)

None of these have been run against a database. Review, then apply in this exact order
(`supabase db push` applies them in filename order; or paste each into the SQL editor).

| # | File | What it does | Client-safe now? |
|---|------|--------------|------------------|
| 1 | `20260601000000_admin_role_enum.sql` | Adds `admin` to `app_role`. No BEGIN/COMMIT on purpose (a new enum value cannot be used in the transaction that adds it). Must be its own committed step. | Yes |
| 2 | `20260601000100_security_hardening.sql` | Write-side RLS fixes: DB-1 squad_members insert (member only, or leader only for a squad you created) + `join_squad_by_code(code)` RPC; AUTH-1 `handle_new_user_role` reads `raw_user_meta_data->>'role'` (volunteer default, `organization` allowed, never admin) and the client insert policy only allows own row with volunteer/organization; DB-2 client write policies on `user_stats`/`user_activities` removed, internal `credit_user_stats` + trigger crediting hours/XP when attendance is verified (DB-14); DB-3 trigger blocks owners from changing `organizations.verified`/`user_id` (admins and service role allowed), unique index on `organizations(user_id)` only if no duplicates; DB-4 registration insert must be status `registered`, not attended, 0 hours, and org owner updates are limited to their own opportunities, 0-24 hours, `verified_by` = self, identity columns frozen; DB-5 log insert only by squad member, `pending`, challenge belongs to squad, value 1-1000, leader update WITH CHECK and frozen columns; DB-9 WITH CHECK on owner UPDATE policies; DB-7 revoke anon EXECUTE, set search_path; DB-18 updated_at triggers. | Yes |
| 3 | `20260601000200_indexes.sql` | DB-15 indexes (IF NOT EXISTS). | Yes |
| 4 | `20260601000300_admin_foundation.sql` | `is_admin(uid)`, `admin_audit_log` (admin select/insert only, append-only), admin read policies on profiles/organizations/opportunities/volunteer_registrations/user_roles, RPCs `admin_set_org_verified(org_id, verified)` and `admin_set_user_role(user_id, role, grant)` (both check `is_admin`, write the audit log; an admin cannot revoke their own admin role). | Yes |
| 5 | `20260601000400_leaderboard_rpc.sql` | DB-6 `get_leaderboard(p_limit)` returns `display_name, avatar_url, xp, total_hours, level, is_me` only. | Yes (new RPC) |
| 6 | `20260601000500_optional_select_hardening.sql` | OPTIONAL. Scopes SELECT on squads, squad_members, squad_challenges, squad_activity_logs to members and volunteer_registrations to owner/org owner (admins always); members-only `get_challenge_progress`/`get_member_contributions`; adds `list_squads()`, `get_opportunity_registration_counts(text[])`, and a squad-creator leader trigger. | NO, see below |

## First admin (manual, one time)
Run in the Supabase SQL editor (runs as postgres, bypasses RLS) after file 1:

```sql
insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where email = 'YOUR_EMAIL_HERE' on conflict do nothing;
```

## Requires client change
- Leaderboard (`src/pages/Leaderboard.tsx`): call `supabase.rpc('get_leaderboard', { p_limit: 50 })` instead of reading `user_stats`+`profiles`. Without this, the leaderboard still shows only the caller's row (existing behavior).
- Signup (`src/pages/Auth.tsx`): pass `options: { data: { full_name, role: 'organization' | 'volunteer' } }` to `signUp`. The existing client-side role insert still works (policy allows it) but is unreliable without a session.
- Join squad (`useSquads.ts joinByCode`): optionally switch to `rpc('join_squad_by_code', { p_code })` (required before applying file 6, since squads become unreadable by code).
- Admin UI (does not exist yet): use `rpc('admin_set_org_verified')`, `rpc('admin_set_user_role')`, `rpc('is_admin')`.
- Only for optional file 6: squads list -> `rpc('list_squads')`; registration counts in `useOrganization.ts` (lines ~154 and ~311) -> `rpc('get_opportunity_registration_counts', { p_ids })`; stop inserting the leader row after creating a squad (`useSquads.ts:109`; the new trigger does it, otherwise a harmless duplicate-key error).
- Behavior changes to expect after file 2: `user_stats` and `user_activities` can no longer be written by the client (nothing in src/ did); the NGO attendance toggle must send 0-24 hours and `verified_by` = the current user (it already does); `organizations.verified` stays false until an admin verifies.

## Rollback notes
- Files are additive/idempotent. To revert a policy, `DROP POLICY` the new one and re-create the original from the earlier migration (original names are reused in most cases).
- File 2: `DROP TRIGGER trg_credit_hours, trg_protect_org, trg_freeze_registration, trg_freeze_log` and drop the associated functions; stats already credited are not reversed. Restore old `user_stats` write policies only if truly required (insecure).
- The unique index can be dropped with `DROP INDEX organizations_user_id_key`.
- Enum values cannot be removed from a Postgres enum; leaving `admin` is harmless.
- File 6: re-create the old `USING (true)` policies (see migrations 20260308124355, 20260308125719, 20260308130941).

## Verification queries
```sql
-- policies in place
select tablename, policyname, cmd from pg_policies where schemaname='public'
  and tablename in ('squad_members','user_roles','user_stats','volunteer_registrations','squad_activity_logs','organizations','admin_audit_log') order by 1,2;
-- anon must not be able to execute these (expect false)
select has_function_privilege('anon','public.has_role(uuid,public.app_role)','execute'),
       has_function_privilege('anon','public.get_leaderboard(int)','execute');
-- duplicate orgs blocking the unique index (expect 0 rows)
select user_id, count(*) from public.organizations group by user_id having count(*) > 1;
-- unique index exists
select indexname from pg_indexes where indexname = 'organizations_user_id_key';
-- admin exists
select u.email from public.user_roles r join auth.users u on u.id=r.user_id where r.role='admin';
-- as an authenticated non-admin (SQL editor: set role authenticated + request.jwt.claims), these must fail:
--   insert into public.squad_members(squad_id,user_id,role) values ('<other squad>', auth.uid(), 'leader');
--   insert into public.user_roles(user_id,role) values (auth.uid(), 'admin');
--   update public.user_stats set xp = 999999;
--   update public.organizations set verified = true;   -- silently stays false (trigger)
```
