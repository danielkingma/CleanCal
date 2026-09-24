-- Linen service: on some properties the cleaner takes the used linen
-- off-site to launder and returns it (or fresh linen) on a later visit,
-- billed per linen box on top of the property's flat payout rate --
-- roughly one box per one-bed bedroom, though a property can have more
-- or fewer than its bedroom_count (a bedroom with two beds might need
-- two boxes, for instance), so it's tracked as its own field rather than
-- reusing bedroom_count.
--
-- Not every booking needs linen taken away (e.g. a multi-night stay's
-- mid-stay clean, or a same-day turnover the cleaner just makes up
-- fresh from on-site stock), so whether a *booking* needs pickup is a
-- per-booking flag staff sets, not something baked into the property's
-- payout rate itself.
--
-- The per-box fee is its own per-property field, not a fixed constant --
-- different host businesses (and even different properties for the same
-- host) charge different amounts for linen service, same as payout_rate_
-- cents already varies per property. Defaults to $20, matching the rate
-- this feature was built around.

alter table public.properties
  add column linen_box_count integer not null default 1 check (linen_box_count >= 0),
  add column linen_fee_cents integer not null default 2000 check (linen_fee_cents >= 0);

alter table public.bookings
  add column linen_pickup boolean not null default false;

-- Financials stay owner-only: 0009_owner_manager_roles.sql split Manager
-- out from Owner specifically noting "never financials (nothing built
-- there yet, but this is where that line goes once it exists)" --
-- payout_rate_cents was the first financial field and slipped in under
-- the general staff-update policy before that line existed anywhere.
-- This is that line: a manager can still update everything else about a
-- property (access instructions, room profile, calendar feeds), but a
-- change to what a cleaner gets paid -- the flat rate or the linen fee --
-- has to come from the owner, whichever client makes the request. RLS is
-- row-level, not column-level, so this is enforced with a trigger that
-- only blocks the update when one of the financial columns actually
-- changed value.
create or replace function public.enforce_property_financials_owner_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() and (
    new.payout_rate_cents is distinct from old.payout_rate_cents or
    new.linen_box_count is distinct from old.linen_box_count or
    new.linen_fee_cents is distinct from old.linen_fee_cents
  ) then
    raise exception 'Only the owner can change payout or linen fee amounts.';
  end if;
  return new;
end;
$$;

drop trigger if exists properties_financials_owner_only on public.properties;
create trigger properties_financials_owner_only
  before update on public.properties
  for each row
  execute function public.enforce_property_financials_owner_only();
