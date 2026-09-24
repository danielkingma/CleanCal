-- Multi-tenancy: CleanCal becomes something other rental-host businesses
-- can sign up for separately, not just this one business's shared tool.
-- Every table that used to be implicitly "the one shared business" now
-- carries (directly or via a trigger-derived column) an
-- `organization_id`, and every RLS policy that used to just check
-- is_admin()/is_owner() now also checks that the row's organization
-- matches the caller's own. All existing data becomes one organization
-- ("Organization 1") owned by whoever already has access to it today --
-- nothing changes for current users day to day, it just stops being the
-- only organization that can ever exist.

-- ---------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stripe_customer_id text,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- Backfill: every row that exists today belongs to this one organization.
insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000001', 'CleanCal');

-- ---------------------------------------------------------------------
-- profiles: organization_id is nullable here, and only here -- a brand
-- new sign-up has no organization yet (see handle_new_user, unchanged
-- below) until they either create one (create_organization) or redeem
-- an invite (redeem_invite). Every other table's organization_id is
-- NOT NULL, since a row there can only ever be created by someone who
-- already has one.
--
-- This has to happen before my_org_id() below can be defined -- that
-- function's body reads profiles.organization_id, which doesn't exist
-- until this ALTER TABLE runs.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column organization_id uuid references public.organizations (id);

update public.profiles set organization_id = '00000000-0000-0000-0000-000000000001';

-- SECURITY DEFINER so this can be used inside RLS policies (same reason
-- is_admin()/is_owner() are SECURITY DEFINER) -- returns null for a
-- signed-in user who hasn't finished onboarding yet, which makes every
-- `organization_id = my_org_id()` check naturally fail closed rather
-- than needing a separate "and organization_id is not null" everywhere.
create or replace function public.my_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create policy "organizations_select_own"
  on public.organizations for select
  using (id = public.my_org_id());

-- No generic write policy -- an organization's own row only ever changes
-- through create_organization() below (self-serve signup) or, later, a
-- billing webhook via the service-role client, same "controlled RPC, not
-- a raw table policy" shape as ical_export_tokens.

-- Once set, a profile's organization can never change via a direct table
-- write -- only the controlled RPCs below ever move a user between
-- organizations (they don't; a user can only ever join one, once). This
-- closes a real gap the "owner can update any profile in their org" RLS
-- policy would otherwise leave open: without this, an owner could set
-- organization_id on someone else's profile to their own org's id and
-- pull that person's account into their business without consent.
create or replace function public.prevent_organization_change()
returns trigger
language plpgsql
as $$
begin
  if old.organization_id is not null and new.organization_id is distinct from old.organization_id then
    raise exception 'A profile cannot be moved between organizations.';
  end if;
  return new;
end;
$$;

create trigger on_profiles_prevent_organization_change
  before update on public.profiles
  for each row execute function public.prevent_organization_change();

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or (public.is_admin() and organization_id = public.my_org_id()));

drop policy if exists "profiles_owner_write" on public.profiles;
create policy "profiles_owner_write"
  on public.profiles for all
  using (public.is_owner() and organization_id = public.my_org_id())
  with check (public.is_owner() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------
alter table public.properties
  add column organization_id uuid references public.organizations (id);

update public.properties set organization_id = '00000000-0000-0000-0000-000000000001';

alter table public.properties
  alter column organization_id set not null;

-- Always the creating staff member's own org, regardless of what the
-- client sends -- the same "the server decides, not the request body"
-- shape as author_name/author_role on dispute_messages (0008).
create or replace function public.properties_set_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.organization_id := public.my_org_id();
  return new;
end;
$$;

create trigger on_properties_before_insert_set_organization
  before insert on public.properties
  for each row execute function public.properties_set_organization();

drop policy if exists "properties_select_authenticated" on public.properties;
create policy "properties_select_own_org"
  on public.properties for select
  using (organization_id = public.my_org_id());

drop policy if exists "properties_staff_insert" on public.properties;
create policy "properties_staff_insert"
  on public.properties for insert
  with check (public.is_admin());

drop policy if exists "properties_staff_update" on public.properties;
create policy "properties_staff_update"
  on public.properties for update
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

drop policy if exists "properties_owner_delete" on public.properties;
create policy "properties_owner_delete"
  on public.properties for delete
  using (public.is_owner() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- bookings: organization_id is derived from property_id on every
-- insert/update (not just set once), so it's never possible for a
-- booking to disagree with its own property about which org it's in --
-- and the same trigger enforces that assigned_cleaner_id, whenever set,
-- always belongs to that same organization. Without this second check,
-- nothing would stop (say) a bug in the open-job claim path from
-- assigning a booking to a cleaner outside the org that posted it.
-- ---------------------------------------------------------------------
alter table public.bookings
  add column organization_id uuid references public.organizations (id);

update public.bookings b
  set organization_id = p.organization_id
  from public.properties p
  where p.id = b.property_id;

alter table public.bookings
  alter column organization_id set not null;

create or replace function public.bookings_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop_org uuid;
  cleaner_org uuid;
begin
  select organization_id into prop_org from public.properties where id = new.property_id;
  if prop_org is null then
    raise exception 'Property not found';
  end if;
  new.organization_id := prop_org;

  if new.assigned_cleaner_id is not null then
    select organization_id into cleaner_org from public.profiles where id = new.assigned_cleaner_id;
    if cleaner_org is distinct from new.organization_id then
      raise exception 'Cannot assign a cleaner from a different organization';
    end if;
  end if;

  return new;
end;
$$;

create trigger on_bookings_before_write
  before insert or update on public.bookings
  for each row execute function public.bookings_before_write();

drop policy if exists "bookings_select_own_open_or_admin" on public.bookings;
create policy "bookings_select_own_open_or_admin"
  on public.bookings for select
  using (
    (public.is_admin() and organization_id = public.my_org_id())
    or assigned_cleaner_id = auth.uid()
    or (is_open_job and assigned_cleaner_id is null and organization_id = public.my_org_id())
  );

drop policy if exists "bookings_admin_write" on public.bookings;
create policy "bookings_admin_write"
  on public.bookings for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- photos + booking-photos storage bucket: scoped via the booking they
-- belong to (assigned cleaner, or staff in that booking's org) rather
-- than a column of their own.
-- ---------------------------------------------------------------------
drop policy if exists "photos_select_authenticated" on public.photos;
create policy "photos_select_own_org_or_assigned"
  on public.photos for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.assigned_cleaner_id = auth.uid() or (public.is_admin() and b.organization_id = public.my_org_id()))
    )
  );

drop policy if exists "photos_admin_write" on public.photos;
create policy "photos_admin_write"
  on public.photos for all
  using (
    public.is_admin()
    and exists (select 1 from public.bookings b where b.id = booking_id and b.organization_id = public.my_org_id())
  )
  with check (
    public.is_admin()
    and exists (select 1 from public.bookings b where b.id = booking_id and b.organization_id = public.my_org_id())
  );

drop policy if exists "booking_photos_select_authenticated" on storage.objects;
create policy "booking_photos_select_own_org_or_assigned"
  on storage.objects for select
  using (
    bucket_id = 'booking-photos'
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[1]
        and (b.assigned_cleaner_id = auth.uid() or (public.is_admin() and b.organization_id = public.my_org_id()))
    )
  );

drop policy if exists "booking_photos_insert_admin_or_assigned" on storage.objects;
create policy "booking_photos_insert_admin_or_assigned"
  on storage.objects for insert
  with check (
    bucket_id = 'booking-photos'
    and (
      exists (
        select 1 from public.bookings b
        where b.id::text = (storage.foldername(name))[1] and b.assigned_cleaner_id = auth.uid()
      )
      or (
        public.is_admin()
        and exists (
          select 1 from public.bookings b
          where b.id::text = (storage.foldername(name))[1] and b.organization_id = public.my_org_id()
        )
      )
    )
  );

drop policy if exists "booking_photos_delete_admin_or_owner" on storage.objects;
create policy "booking_photos_delete_admin_or_owner"
  on storage.objects for delete
  using (
    bucket_id = 'booking-photos'
    and (
      owner = auth.uid()
      or (
        public.is_admin()
        and exists (
          select 1 from public.bookings b
          where b.id::text = (storage.foldername(name))[1] and b.organization_id = public.my_org_id()
        )
      )
    )
  );

-- ---------------------------------------------------------------------
-- ical_feeds
-- ---------------------------------------------------------------------
alter table public.ical_feeds
  add column organization_id uuid references public.organizations (id);

update public.ical_feeds f
  set organization_id = p.organization_id
  from public.properties p
  where p.id = f.property_id;

alter table public.ical_feeds
  alter column organization_id set not null;

create or replace function public.ical_feeds_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop_org uuid;
begin
  select organization_id into prop_org from public.properties where id = new.property_id;
  if prop_org is null then
    raise exception 'Property not found';
  end if;
  new.organization_id := prop_org;
  return new;
end;
$$;

create trigger on_ical_feeds_before_write
  before insert or update on public.ical_feeds
  for each row execute function public.ical_feeds_before_write();

drop policy if exists "ical_feeds_admin_all" on public.ical_feeds;
create policy "ical_feeds_admin_all"
  on public.ical_feeds for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- ical_export_tokens: no column of its own -- it's a 1:1 with
-- properties, so scoping through that join is simpler than adding and
-- maintaining a denormalized copy on a table this small.
-- ---------------------------------------------------------------------
drop policy if exists "ical_export_tokens_select_staff" on public.ical_export_tokens;
create policy "ical_export_tokens_select_staff"
  on public.ical_export_tokens for select
  using (
    public.is_admin()
    and exists (select 1 from public.properties p where p.id = property_id and p.organization_id = public.my_org_id())
  );

create or replace function public.regenerate_ical_export_token(p_property_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  if not exists (
    select 1 from public.properties where id = p_property_id and organization_id = public.my_org_id()
  ) then
    raise exception 'Not authorized';
  end if;
  update public.ical_export_tokens
    set token = gen_random_uuid()
    where property_id = p_property_id
    returning token into new_token;
  return new_token;
end;
$$;

-- ---------------------------------------------------------------------
-- dispute_messages
-- ---------------------------------------------------------------------
alter table public.dispute_messages
  add column organization_id uuid references public.organizations (id);

update public.dispute_messages dm
  set organization_id = b.organization_id
  from public.bookings b
  where b.id = dm.booking_id;

alter table public.dispute_messages
  alter column organization_id set not null;

create or replace function public.dispute_messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_org uuid;
begin
  select organization_id into booking_org from public.bookings where id = new.booking_id;
  if booking_org is null then
    raise exception 'Booking not found';
  end if;
  new.organization_id := booking_org;
  return new;
end;
$$;

create trigger on_dispute_messages_before_insert_set_organization
  before insert on public.dispute_messages
  for each row execute function public.dispute_messages_before_insert();

drop policy if exists "dispute_messages_select" on public.dispute_messages;
create policy "dispute_messages_select"
  on public.dispute_messages for select
  using (
    (public.is_admin() and organization_id = public.my_org_id())
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.assigned_cleaner_id = auth.uid()
    )
  );

-- insert policies (admin / assigned cleaner) are unaffected -- both
-- already resolve to "this booking is mine or I run the place", and
-- bookings_before_write already guarantees an assigned cleaner is
-- always in the same org as the booking they're assigned to.

-- ---------------------------------------------------------------------
-- cleaner_unavailable_dates: staff visibility narrows to cleaners in
-- their own org (self-service insert/delete is untouched -- a cleaner
-- managing their own rows was never cross-org in the first place).
-- ---------------------------------------------------------------------
drop policy if exists "cleaner_unavailable_select" on public.cleaner_unavailable_dates;
create policy "cleaner_unavailable_select"
  on public.cleaner_unavailable_dates for select
  using (
    cleaner_id = auth.uid()
    or (
      public.is_admin()
      and exists (select 1 from public.profiles p where p.id = cleaner_id and p.organization_id = public.my_org_id())
    )
  );

-- ---------------------------------------------------------------------
-- staff_user_ids(): used to find who to push-notify (a new open job, a
-- decline, a dispute reply). Narrowing this to the caller's own org
-- matters now -- without it, an event in one business would notify
-- every Owner/Manager on the platform, not just that business's own.
-- ---------------------------------------------------------------------
create or replace function public.staff_user_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select id from public.profiles
  where role in ('owner', 'manager') and organization_id = public.my_org_id();
$$;

-- ---------------------------------------------------------------------
-- organization_invites: how a staff member brings someone else into
-- their own organization (a new sign-up has no other way in -- see
-- handle_new_user, unchanged, and create_organization/redeem_invite
-- below). Only an Owner can invite at Owner/Manager level, same
-- boundary as changing an existing member's role (profiles_owner_write)
-- -- a Manager can invite a cleaner, never another Manager or an Owner.
-- ---------------------------------------------------------------------
create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  role text not null default 'cleaner' check (role in ('owner', 'manager', 'cleaner')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles (id)
);

alter table public.organization_invites enable row level security;

create policy "organization_invites_select_staff"
  on public.organization_invites for select
  using (public.is_admin() and organization_id = public.my_org_id());

create policy "organization_invites_insert_staff"
  on public.organization_invites for insert
  with check (
    organization_id = public.my_org_id()
    and created_by = auth.uid()
    and (role = 'cleaner' or public.is_owner())
  );

-- A not-yet-onboarded invitee has no organization (my_org_id() is null)
-- and isn't staff of the org they're about to join, so
-- organization_invites_select_staff doesn't let them read the invite row
-- to see what they're accepting -- this narrow RPC exposes just the
-- organization's name for a valid, unredeemed token, the same
-- "unguessable token stands in for auth" shape as the public .ics export
-- (0010_ical_export.sql).
create or replace function public.preview_invite(p_token uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select o.name
  from public.organization_invites i
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token and i.redeemed_at is null;
$$;

grant execute on function public.preview_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- create_organization() / redeem_invite(): the only two ways a
-- signed-in user with no organization yet (organization_id is null --
-- see handle_new_user, unchanged) ever gets one. Both refuse to run
-- again for someone who already has an org, since a profile's
-- organization can never change once set (on_profiles_prevent_
-- organization_change above) -- this is the friendlier error for the
-- same rule, checked before that trigger would fire.
-- ---------------------------------------------------------------------
create or replace function public.create_organization(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
  existing_org_id uuid;
begin
  select organization_id into existing_org_id from public.profiles where id = auth.uid();
  if existing_org_id is not null then
    raise exception 'You already belong to an organization.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Give your business a name.';
  end if;

  insert into public.organizations (name) values (trim(p_name)) returning * into org;
  update public.profiles set organization_id = org.id, role = 'owner' where id = auth.uid();
  return org;
end;
$$;

grant execute on function public.create_organization(text) to authenticated;

create or replace function public.redeem_invite(p_token uuid)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.organization_invites;
  org public.organizations;
  existing_org_id uuid;
begin
  select organization_id into existing_org_id from public.profiles where id = auth.uid();
  if existing_org_id is not null then
    raise exception 'You already belong to an organization.';
  end if;

  select * into inv from public.organization_invites where token = p_token and redeemed_at is null;
  if inv.id is null then
    raise exception 'This invite link is invalid or has already been used.';
  end if;

  update public.profiles set organization_id = inv.organization_id, role = inv.role where id = auth.uid();
  update public.organization_invites set redeemed_at = now(), redeemed_by = auth.uid() where id = inv.id;

  select * into org from public.organizations where id = inv.organization_id;
  return org;
end;
$$;

grant execute on function public.redeem_invite(uuid) to authenticated;
