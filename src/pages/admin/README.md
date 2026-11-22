# Admin panel

Routes: `/admin` and `/admin/:section` (`overview`, `organizations`, `users`, `audit`).

`AdminRoute` is a UX gate only. Real access control is enforced by the database
(`is_admin()`, RLS policies and the `admin_set_*` SECURITY DEFINER RPCs).

## Granting the first admin

1. Apply the admin migrations in order (see `supabase/MIGRATIONS_README.md`):
   `20260601000000_admin_role_enum.sql`, then `20260601000300_admin_foundation.sql`.
2. In the Supabase SQL editor (service role), run:
   `INSERT INTO public.user_roles (user_id, role) VALUES ('<auth user uuid>', 'admin') ON CONFLICT DO NOTHING;`
3. Sign in as that user; an "Admin" link appears in the navbar.

Further admins can be granted from the Users tab.
