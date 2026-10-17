-- Owner statements add-on, phase 1: the data foundation.
--
-- "Owner" already means the person who owns the CleanCal account (the
-- profiles.role value), so the landlords whose properties are managed
-- are called property owners here and "Clients" in the UI.
--
-- Everything money-related lives in its own staff-only tables rather
-- than as extra columns on properties/bookings: cleaners can read their
-- org's properties and bookings (see 0016_organizations.sql), and they
-- must never see management fees or payout amounts.

-- ---------------------------------------------------------------------
-- Add-on switch. Off by default; the superadmin account always sees the
-- feature (beta), and an org gets it once this is turned on for it.
-- ---------------------------------------------------------------------
alter table public.organizations
  add column statements_enabled boolean not null default false;

-- ---------------------------------------------------------------------
-- property_owners: the clients a manager reports to.
-- ---------------------------------------------------------------------
create table public.property_owners (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null check (length(trim(name)) > 0),
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.property_owners_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.organization_id := public.my_org_id();
  else
    new.organization_id := old.organization_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_property_owners_before_write
  before insert or update on public.property_owners
  for each row execute function public.property_owners_before_write();

alter table public.property_owners enable row level security;

create policy "property_owners_staff_all"
  on public.property_owners for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- property_financials: one row per property with its client and fee
-- rules, plus the listing identifiers payout exports use, so imported
-- rows can be matched to the right property.
--
-- owner_cleaning_charge_cents null = charge the owner the property's
-- cleaner payout rate (plus its linen fee when linen was picked up).
-- ---------------------------------------------------------------------
create table public.property_financials (
  property_id uuid primary key references public.properties (id) on delete cascade,
  organization_id uuid not null references public.organizations (id),
  property_owner_id uuid references public.property_owners (id) on delete set null,
  mgmt_fee_percent numeric(5, 2) not null default 0 check (mgmt_fee_percent between 0 and 100),
  fee_basis text not null default 'net_of_cleaning' check (fee_basis in ('gross', 'net_of_cleaning')),
  owner_cleaning_charge_cents integer check (owner_cleaning_charge_cents >= 0),
  airbnb_listing_name text not null default '',
  booking_com_property_id text not null default '',
  updated_at timestamptz not null default now()
);

create index property_financials_owner_idx on public.property_financials (property_owner_id);

create or replace function public.property_financials_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop_org uuid;
  owner_org uuid;
begin
  select organization_id into prop_org from public.properties where id = new.property_id;
  if prop_org is null then
    raise exception 'Property not found';
  end if;
  new.organization_id := prop_org;
  if new.property_owner_id is not null then
    select organization_id into owner_org from public.property_owners where id = new.property_owner_id;
    if owner_org is distinct from prop_org then
      raise exception 'Client not found';
    end if;
  end if;
  new.airbnb_listing_name := trim(new.airbnb_listing_name);
  new.booking_com_property_id := trim(new.booking_com_property_id);
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_property_financials_before_write
  before insert or update on public.property_financials
  for each row execute function public.property_financials_before_write();

alter table public.property_financials enable row level security;

create policy "property_financials_staff_all"
  on public.property_financials for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- bookings.confirmation_code: the platform's reservation code (Airbnb's
-- HM… code). Read from the Airbnb iCal DESCRIPTION on sync, or filled by
-- a payout import. Not financial, so it can sit on bookings.
-- ---------------------------------------------------------------------
alter table public.bookings
  add column confirmation_code text;

create index bookings_org_confirmation_code_idx
  on public.bookings (organization_id, upper(confirmation_code))
  where confirmation_code is not null;

-- ---------------------------------------------------------------------
-- payout_imports: one row per uploaded file, so a whole import can be
-- reviewed or undone (its lines cascade).
-- ---------------------------------------------------------------------
create table public.payout_imports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  platform text not null check (platform in ('airbnb', 'booking_com', 'other')),
  file_name text not null default '',
  uploaded_by uuid references public.profiles (id) on delete set null,
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_matched integer not null default 0,
  rows_duplicate integer not null default 0,
  rows_skipped integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.set_organization_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.organization_id := public.my_org_id();
  else
    new.organization_id := old.organization_id;
  end if;
  return new;
end;
$$;

create trigger on_payout_imports_before_write
  before insert or update on public.payout_imports
  for each row execute function public.set_organization_on_insert();

alter table public.payout_imports enable row level security;

create policy "payout_imports_staff_all"
  on public.payout_imports for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- payout_lines: each money row from a payout export. A line counts
-- toward a statement once it has a property; the booking link is extra
-- detail (guest, nights, cleaning job). A booking later deleted by the
-- iCal sync (a cancellation) leaves its payout line behind with the
-- booking link cleared, rather than losing money from the record.
--
-- dedupe_key is built by the app from the row's identifying fields, so
-- importing the same file twice adds nothing the second time.
-- ---------------------------------------------------------------------
create table public.payout_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  import_id uuid not null references public.payout_imports (id) on delete cascade,
  booking_id uuid references public.bookings (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  platform text not null check (platform in ('airbnb', 'booking_com', 'other')),
  line_type text not null default 'reservation'
    check (line_type in ('reservation', 'adjustment', 'cancellation_fee', 'other')),
  confirmation_code text not null default '',
  guest_name text not null default '',
  listing_text text not null default '',
  listing_ref text not null default '', -- Booking.com property ID, when the export has one
  checkin_date date,
  nights integer check (nights >= 0),
  payout_date date,
  amount_cents integer not null,
  currency text not null default 'AUD',
  match_status text not null default 'unmatched'
    check (match_status in ('matched', 'property_only', 'unmatched', 'ignored')),
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, dedupe_key)
);

create index payout_lines_property_date_idx on public.payout_lines (property_id, payout_date);
create index payout_lines_status_idx on public.payout_lines (organization_id, match_status);

create or replace function public.payout_lines_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org uuid;
  other_org uuid;
begin
  if tg_op = 'INSERT' then
    org := public.my_org_id();
  else
    org := old.organization_id;
  end if;
  new.organization_id := org;

  select organization_id into other_org from public.payout_imports where id = new.import_id;
  if other_org is distinct from org then
    raise exception 'Import not found';
  end if;
  if new.booking_id is not null then
    declare
      booking_prop uuid;
    begin
      select organization_id, property_id into other_org, booking_prop
        from public.bookings where id = new.booking_id;
      if other_org is distinct from org then
        raise exception 'Booking not found';
      end if;
      -- A booking always decides the property, so the two can't disagree.
      new.property_id := booking_prop;
    end;
  end if;
  if new.property_id is not null then
    select organization_id into other_org from public.properties where id = new.property_id;
    if other_org is distinct from org then
      raise exception 'Property not found';
    end if;
  end if;

  -- Keep the status honest whatever the caller sent, except an explicit
  -- 'ignored', which is the user's call.
  if new.match_status <> 'ignored' then
    if new.booking_id is not null and new.property_id is not null then
      new.match_status := 'matched';
    elsif new.property_id is not null then
      new.match_status := 'property_only';
    else
      new.match_status := 'unmatched';
    end if;
  end if;
  return new;
end;
$$;

create trigger on_payout_lines_before_write
  before insert or update on public.payout_lines
  for each row execute function public.payout_lines_before_write();

alter table public.payout_lines enable row level security;

create policy "payout_lines_staff_all"
  on public.payout_lines for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());
