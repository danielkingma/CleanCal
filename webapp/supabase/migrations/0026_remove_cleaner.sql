-- Owner-only "remove cleaner" (Cleaners page). Not a hard delete of the
-- auth user / profile row: several tables reference profiles(id) with no
-- ON DELETE cascade specified, so a plain `delete` would be rejected by
-- Postgres the moment a cleaner has any real history --
-- dispute_messages.author_id (0008_dispute_resolution.sql) and
-- organization_invites.created_by/redeemed_by (0016_organizations.sql)
-- are both `references public.profiles(id)` with no cascade, and every
-- invited cleaner has a redeemed_by row by definition. Deleting the auth
-- user would also silently erase their rating/dispute/payout history,
-- which the rest of the app (History, Reports, dispute threads) still
-- needs to make sense of past bookings.
--
-- So "remove" here means: mark them deactivated, hide them from active
-- cleaner lists and assignment pickers, and rely on the app's own
-- middleware (src/proxy.ts) to sign them out and block them from getting
-- back in -- while every past booking, rating, and dispute message they
-- were part of stays exactly as it was. Reversible (restore_cleaner-style
-- update, see cleaners/actions.ts) in case someone's removed by mistake.
alter table public.profiles
  add column deactivated_at timestamptz;

-- Already-staff (owner) confirms via `profiles_owner_write` RLS
-- (0009_owner_manager_roles.sql, `for all using (is_owner())`), same as
-- updateUserRole in cleaners/actions.ts already relies on -- no new RLS
-- needed for the column itself.
