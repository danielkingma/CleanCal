-- Enables a real, permanent delete of a cleaner's account (as opposed to
-- removeCleaner()/0026_remove_cleaner.sql, which only deactivates and
-- signs them out, keeping everything). "Delete" in cleaners/actions.ts
-- deletes the auth.users row via the Admin API, which cascades to the
-- profiles row (`references auth.users (id) on delete cascade`,
-- 0001_init.sql) -- but that cascade would itself fail wherever another
-- table still points at the profile with the default RESTRICT behavior,
-- rolling back the whole deletion. This migration loosens exactly those
-- four columns (plus one more found the same way) so the delete can go
-- through:
--
--   * dispute_messages.author_id, organization_invites.created_by --
--     both `not null`, so they're made nullable first. Neither loses any
--     readable history: dispute_messages already keeps its own
--     author_name/author_role snapshot (0008), and organization_invites
--     never showed who created it in the UI to begin with.
--   * organization_invites.redeemed_by, photos.uploaded_by,
--     bookings.requested_cleaner_id -- already nullable, just missing an
--     explicit `on delete` action (default RESTRICT).
--
-- All five become `on delete set null`, matching the same treatment
-- bookings.assigned_cleaner_id already got in 0001_init.sql.
alter table public.dispute_messages alter column author_id drop not null;
alter table public.dispute_messages drop constraint dispute_messages_author_id_fkey;
alter table public.dispute_messages
  add constraint dispute_messages_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;

alter table public.organization_invites alter column created_by drop not null;
alter table public.organization_invites drop constraint organization_invites_created_by_fkey;
alter table public.organization_invites
  add constraint organization_invites_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.organization_invites drop constraint organization_invites_redeemed_by_fkey;
alter table public.organization_invites
  add constraint organization_invites_redeemed_by_fkey
  foreign key (redeemed_by) references public.profiles (id) on delete set null;

alter table public.photos drop constraint photos_uploaded_by_fkey;
alter table public.photos
  add constraint photos_uploaded_by_fkey
  foreign key (uploaded_by) references public.profiles (id) on delete set null;

alter table public.bookings drop constraint bookings_requested_cleaner_id_fkey;
alter table public.bookings
  add constraint bookings_requested_cleaner_id_fkey
  foreign key (requested_cleaner_id) references public.profiles (id) on delete set null;
