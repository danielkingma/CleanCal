-- 0029_delete_cleaner_account.sql's final statement tried to drop and
-- recreate bookings_requested_cleaner_id_fkey -- a constraint that no
-- longer existed by the time 0029 was written. 0022_remove_approval_instant_claim.sql,
-- seven migrations earlier, had already dropped bookings.requested_cleaner_id
-- (the column, and with it that constraint) entirely. 0029's own comment
-- ("already nullable, just missing an explicit `on delete` action") shows
-- the column was mistakenly believed to still be there.
--
-- That statement fails against any real Postgres, Supabase included --
-- confirmed by replaying this repo's full migration history against a
-- real local Postgres instance, which is the same way this repo's other
-- security-sensitive migrations have been verified before shipping rather
-- than just read through. It isn't a quirk of that local replay tooling.
--
-- Because that last statement errors, whether 0029's other four fixes
-- actually committed in production depends on how the migration was
-- originally applied there: a tool that runs each statement separately
-- (plain autocommit psql) keeps whatever ran before the failure, while one
-- that sends the whole file as a single multi-statement query lets
-- Postgres roll the entire file back as one unit. Rather than assume
-- either starting state, this migration re-asserts all four of 0029's
-- still-valid fixes idempotently (`drop constraint if exists` before each
-- `add constraint`; `drop not null` is already a no-op if the column is
-- already nullable) -- safe to run whether those four already landed or
-- never did. The fifth fix (bookings.requested_cleaner_id) is dropped from
-- this re-run entirely: the column is gone, so there's nothing left to
-- loosen.
--
-- Net effect either way: permanently deleting a cleaner's account
-- (the real delete in cleaners/actions.ts, as opposed to removeCleaner()'s
-- deactivate-only path) can actually complete, instead of failing and
-- rolling back on a RESTRICT foreign key the moment that cleaner has ever
-- sent a dispute message, created or redeemed an org invite, or uploaded a
-- photo.
alter table public.dispute_messages alter column author_id drop not null;
alter table public.dispute_messages drop constraint if exists dispute_messages_author_id_fkey;
alter table public.dispute_messages
  add constraint dispute_messages_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;

alter table public.organization_invites alter column created_by drop not null;
alter table public.organization_invites drop constraint if exists organization_invites_created_by_fkey;
alter table public.organization_invites
  add constraint organization_invites_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.organization_invites drop constraint if exists organization_invites_redeemed_by_fkey;
alter table public.organization_invites
  add constraint organization_invites_redeemed_by_fkey
  foreign key (redeemed_by) references public.profiles (id) on delete set null;

alter table public.photos drop constraint if exists photos_uploaded_by_fkey;
alter table public.photos
  add constraint photos_uploaded_by_fkey
  foreign key (uploaded_by) references public.profiles (id) on delete set null;
