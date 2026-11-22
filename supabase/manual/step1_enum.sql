-- Adds the 'admin' value to app_role.
-- IMPORTANT: this file intentionally has NO BEGIN/COMMIT. A new enum value cannot be
-- used in the same transaction that adds it, so it must be committed on its own and
-- BEFORE 20260601000300_admin_foundation.sql runs. Idempotent.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
