-- Phase 3: calendar sync from any iCal feed -- Airbnb, Vrbo, Booking.com,
-- and a client's own direct-booking site all publish one, so this covers
-- "any API link from a personal booking site" the same way it covers the
-- big OTAs, without needing a partner API application. Plus per-property
-- access instructions (door codes, parking) for cleaners.

alter table public.properties
  add column access_instructions text not null default '';

-- `source`/`external_uid` distinguish an iCal-imported booking from a
-- manually-created one and let re-syncing the same feed update (rather
-- than duplicate) a reservation. A plain (non-partial) unique constraint
-- is used deliberately: Postgres treats NULL <> NULL, so manually-created
-- bookings (external_uid null) never collide with each other, while two
-- iCal rows for the same property+UID do -- which is exactly what
-- ON CONFLICT (property_id, external_uid) upserts need.
alter table public.bookings
  add column source text not null default 'manual' check (source in ('manual', 'ical')),
  add column external_uid text,
  add column ical_missing_since timestamptz;

alter table public.bookings
  add constraint bookings_property_external_uid_key unique (property_id, external_uid);

create table public.ical_feeds (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  source_label text not null,
  ical_url text not null,
  last_synced_at timestamptz,
  last_sync_status text not null default 'never' check (last_sync_status in ('never', 'ok', 'error')),
  last_sync_error text,
  created_at timestamptz not null default now()
);

alter table public.ical_feeds enable row level security;

-- Feed URLs are operational config, not something cleaners need -- admin only.
create policy "ical_feeds_admin_all"
  on public.ical_feeds for all
  using (public.is_admin())
  with check (public.is_admin());
