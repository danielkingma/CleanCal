-- Replaces the two fixed listing fields on property_financials
-- (airbnb_listing_name, booking_com_property_id) with a list: any number
-- of platform listings per property, on any platform. Each is what a
-- payout export calls that property -- a listing title or an ID -- and
-- is what an imported payout row is matched against when it has no
-- confirmation code to go on.
--
-- platform is the display name the calendar's platform badges already
-- use ("Airbnb", "Vrbo", "Stayz", …) or a host's own label, not an enum,
-- so a new platform never needs a migration.

create table public.property_platform_listings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  property_id uuid not null references public.properties (id) on delete cascade,
  platform text not null check (length(btrim(platform)) > 0),
  identifier text not null check (length(btrim(identifier)) > 0),
  -- Same normalisation as normaliseListing() in src/lib/payout-import.ts,
  -- so "Stylish Loft – Braddon!" and "stylish loft braddon" are one key.
  identifier_key text generated always as (
    btrim(regexp_replace(lower(identifier), '[^a-z0-9]+', ' ', 'g'))
  ) stored,
  created_at timestamptz not null default now()
);

create index property_platform_listings_property_idx on public.property_platform_listings (property_id);

-- One listing can only point at one property, or a payout would have two
-- possible homes.
create unique index property_platform_listings_unique_idx
  on public.property_platform_listings (organization_id, lower(platform), identifier_key);

create or replace function public.property_platform_listings_before_write()
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
  new.platform := btrim(new.platform);
  new.identifier := btrim(new.identifier);
  return new;
end;
$$;

create trigger on_property_platform_listings_before_write
  before insert or update on public.property_platform_listings
  for each row execute function public.property_platform_listings_before_write();

alter table public.property_platform_listings enable row level security;

create policy "property_platform_listings_staff_all"
  on public.property_platform_listings for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- Carry over anything already entered in the old fields. Runs as the
-- migration owner, so RLS doesn't apply; the trigger sets the org.
insert into public.property_platform_listings (property_id, platform, identifier)
select property_id, 'Airbnb', airbnb_listing_name
from public.property_financials
where btrim(airbnb_listing_name) <> ''
on conflict do nothing;

insert into public.property_platform_listings (property_id, platform, identifier)
select property_id, 'Booking.com', booking_com_property_id
from public.property_financials
where btrim(booking_com_property_id) <> ''
on conflict do nothing;

-- The old columns are no longer read or written by the app. They're left
-- in place for now so this migration can run before or after the code
-- deploys without anything breaking, and dropped in a later migration.
comment on column public.property_financials.airbnb_listing_name is 'Deprecated: see property_platform_listings (0045).';
comment on column public.property_financials.booking_com_property_id is 'Deprecated: see property_platform_listings (0045).';
