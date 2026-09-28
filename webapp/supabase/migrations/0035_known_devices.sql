-- Supabase Auth already allows multiple concurrent sessions per account by
-- default (a phone and a computer signed in at once needs no change there)
-- -- what's missing is any record of *which* devices an account has signed
-- in on, so the account holder can be told about a new one. This table is
-- that record: one row per (user, device), where "device" is a random id
-- stored in a long-lived browser cookie (see src/lib/device-session.ts),
-- not tied to any particular Supabase session.
create table if not exists public.known_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  label text not null default 'a device',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

alter table public.known_devices enable row level security;

create policy "known_devices_select_own"
  on public.known_devices for select
  using (user_id = auth.uid());

create policy "known_devices_insert_own"
  on public.known_devices for insert
  with check (user_id = auth.uid());

create policy "known_devices_update_own"
  on public.known_devices for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
