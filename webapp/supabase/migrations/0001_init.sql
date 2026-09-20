-- CleanCal schema: properties, bookings, photos, profiles (users + role)
-- Role permissions are enforced here, in Postgres, not in the app UI:
--   * admins get full read/write via RLS `is_admin()` policies
--   * cleaners get read access, and can only write status/checklist/photos
--     on bookings assigned to them, via the SECURITY DEFINER RPCs below

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles (one row per auth.users row; role lives here, not in the UI)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role text not null default 'cleaner' check (role in ('admin', 'cleaner')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER so this can be used inside RLS policies without the
-- policy recursing back into profiles' own (not-yet-evaluated) RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'admin',
    false
  );
$$;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_write"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- Let a signed-in user rename themselves without granting them UPDATE on
-- the whole row (which would otherwise let them set their own role).
create or replace function public.update_own_name(new_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  update public.profiles set name = new_name where id = auth.uid();
  select * into p from public.profiles where id = auth.uid();
  return p;
end;
$$;

grant execute on function public.update_own_name(text) to authenticated;

-- Auto-create a profile (default role: cleaner) whenever someone signs up.
-- New admins must be promoted manually -- see README.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'cleaner'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

create policy "properties_select_authenticated"
  on public.properties for select
  using (auth.role() = 'authenticated');

create policy "properties_admin_write"
  on public.properties for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  checkin_date date not null,
  nights integer not null default 1 check (nights > 0),
  status text not null default 'to-clean' check (status in ('to-clean', 'in-progress', 'complete')),
  notes text not null default '',
  checklist jsonb not null default '{}'::jsonb,
  assigned_cleaner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "bookings_select_authenticated"
  on public.bookings for select
  using (auth.role() = 'authenticated');

-- Only admins may create bookings, edit core details (property/dates), or
-- delete them -- enforced here, not just by hiding buttons in the UI.
create policy "bookings_admin_write"
  on public.bookings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Cleaners have no generic UPDATE policy on bookings (so a direct table
-- update is denied by RLS default-deny). They can only move a booking
-- through status/checklist via this RPC, and only when it's assigned to
-- them -- the actual server-side enforcement of "cleaners can update
-- status/checklist/photos on bookings assigned to them".
create or replace function public.cleaner_update_booking(
  p_booking_id uuid,
  p_status text default null,
  p_checklist jsonb default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then
    raise exception 'booking not found';
  end if;
  if b.assigned_cleaner_id is distinct from auth.uid() then
    raise exception 'not assigned to this booking';
  end if;

  if p_status is not null then
    if p_status not in ('to-clean', 'in-progress', 'complete') then
      raise exception 'invalid status %', p_status;
    end if;
    update public.bookings set status = p_status, updated_at = now() where id = p_booking_id;
  end if;

  if p_checklist is not null then
    update public.bookings set checklist = p_checklist, updated_at = now() where id = p_booking_id;
  end if;

  select * into b from public.bookings where id = p_booking_id;
  return b;
end;
$$;

grant execute on function public.cleaner_update_booking(uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "photos_select_authenticated"
  on public.photos for select
  using (auth.role() = 'authenticated');

create policy "photos_admin_write"
  on public.photos for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "photos_cleaner_insert_assigned"
  on public.photos for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.assigned_cleaner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- realtime (so every signed-in device sees booking changes live, like
-- the original prototype's local onSnapshot)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.bookings;
