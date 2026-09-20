-- Phase 2: real photo uploads to Storage, and scoping cleaners' calendar
-- to only the bookings assigned to them (both enforced in Postgres/Storage
-- RLS, not just by the app's queries).

-- ---------------------------------------------------------------------
-- Scope cleaners' bookings visibility to their own assignments.
-- Admins are unaffected (still covered by `bookings_admin_write`'s ALL
-- policy). This also scopes the Realtime `postgres_changes` subscription
-- in CalendarApp.tsx, since Supabase Realtime re-checks this same SELECT
-- policy per subscriber.
-- ---------------------------------------------------------------------
drop policy if exists "bookings_select_authenticated" on public.bookings;

create policy "bookings_select_own_or_admin"
  on public.bookings for select
  using (public.is_admin() or assigned_cleaner_id = auth.uid());

-- Cleaners can remove a photo they uploaded themselves on a booking still
-- assigned to them (mirrors the storage delete policy below).
create policy "photos_cleaner_delete_own"
  on public.photos for delete
  using (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.assigned_cleaner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Storage bucket for booking photos. Private -- served via short-lived
-- signed URLs, not public links.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('booking-photos', 'booking-photos', false)
on conflict (id) do nothing;

-- Objects are stored at `<booking_id>/<filename>`, so
-- (storage.foldername(name))[1] recovers the booking id to check
-- assignment without a separate lookup table.

create policy "booking_photos_select_authenticated"
  on storage.objects for select
  using (bucket_id = 'booking-photos' and auth.role() = 'authenticated');

create policy "booking_photos_insert_admin_or_assigned"
  on storage.objects for insert
  with check (
    bucket_id = 'booking-photos'
    and (
      public.is_admin()
      or exists (
        select 1 from public.bookings b
        where b.id::text = (storage.foldername(name))[1]
          and b.assigned_cleaner_id = auth.uid()
      )
    )
  );

create policy "booking_photos_delete_admin_or_owner"
  on storage.objects for delete
  using (bucket_id = 'booking-photos' and (public.is_admin() or owner = auth.uid()));
