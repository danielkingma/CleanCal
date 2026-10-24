-- organizations.subscription_status (trialing/active/past_due/canceled) has
-- never, until now, had any actual effect on access -- it was purely
-- informational (Profile billing card, trial banner). An org could cancel
-- and keep full, unmetered use indefinitely.
--
-- Deliberate scope, decided before writing this:
--   * trialing/active -- unaffected, obviously.
--   * past_due -- also unaffected. A failed card already gets Stripe's own
--     retry/dunning emails plus the existing "update your payment method"
--     nag on the Profile billing card; punishing a merely-expired card with
--     a hard lockout would be a worse failure mode than a few extra retry
--     days.
--   * canceled -- gets a real, database-level read-only lockout. This is
--     the only state this migration changes behaviour for.
--
-- Enforced the same way org_has_pro()/update_dispatcher_enabled()
-- (0058_pro_gated_features.sql) enforce Pro-gating: in the database, not
-- just the UI, so a session calling the underlying table write directly
-- can't bypass it either. Verified end to end against a real local
-- Postgres instance (two orgs, one canceled one not, every gated table
-- exercised) before shipping, same as that precedent.
--
-- Table selection: every table with its own organization_id column is
-- gated, with two deliberate exceptions, plus photos (gated via its
-- booking's organization_id, since the table itself has none):
--   * profiles -- left writable. Personal account housekeeping (name,
--     notification prefs, avatar) isn't the paid product and costs
--     nothing to leave open.
--   * organizations itself -- left alone. Its own writes already go
--     through role-gated RPCs (update_dispatcher_enabled() and friends)
--     or the Stripe webhook's service-role client recording the very
--     status change that would lift this lockout; blanket-guarding the
--     row risks guarding the reactivation path itself.
-- Also deliberately left out, as genuinely marginal rather than oversights:
-- cleaner_unavailable_dates (a cleaner's own availability, keyed by
-- cleaner not org), ical_export_tokens (a property's export token, rarely
-- touched), known_devices/push_subscriptions (device plumbing, not
-- business data), campaign_codes (admin-managed, not org-scoped at all),
-- and referrals (written once by an RPC at signup, not ongoing usage).
--
-- is_superadmin() lets Daniel's own account (src/lib/superadmin.ts's
-- SUPERADMIN_EMAIL, mirrored here) act on a canceled org for support
-- purposes -- e.g. fixing up data before helping someone reactivate.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users where id = auth.uid() and email = 'danielkingma@gmail.com'
  );
$$;

create or replace function public.block_writes_if_org_canceled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status text;
begin
  if public.is_superadmin() then
    return coalesce(new, old);
  end if;

  select subscription_status into status
  from public.organizations
  where id = coalesce(new.organization_id, old.organization_id);

  if status = 'canceled' then
    raise exception 'This organization''s subscription has been canceled -- reactivate it from My Profile > Billing to make changes.';
  end if;

  return coalesce(new, old);
end;
$$;

-- photos has no organization_id of its own -- only booking_id -- so it
-- gets its own small variant that looks the status up through its booking.
create or replace function public.block_photo_writes_if_org_canceled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  status text;
begin
  if public.is_superadmin() then
    return coalesce(new, old);
  end if;

  select o.subscription_status into status
  from public.bookings b
  join public.organizations o on o.id = b.organization_id
  where b.id = coalesce(new.booking_id, old.booking_id);

  if status = 'canceled' then
    raise exception 'This organization''s subscription has been canceled -- reactivate it from My Profile > Billing to make changes.';
  end if;

  return coalesce(new, old);
end;
$$;

-- Named zz_* on purpose: almost every one of these tables already has its
-- own BEFORE INSERT trigger (*_before_write, *_before_insert_set_organization,
-- set_organization_on_insert, properties_set_organization -- see those
-- migrations) that derives organization_id itself rather than trusting a
-- client-supplied value, e.g. properties.organization_id is only ever set
-- by properties_set_organization() from my_org_id() -- the app's own
-- insert({ name }) call in properties/actions.ts never sends one. Multiple
-- BEFORE triggers on the same table fire in alphabetical order by name, so
-- this one has to sort after all of those (hence zz_, not a plain name) or
-- it would run first and see organization_id still null, silently letting
-- a canceled org's insert through instead of blocking it. Verified by
-- replaying this exact scenario -- an insert shaped like the app's real
-- insert({ name }) call, no organization_id in the payload -- against the
-- local Postgres instance.
create trigger zz_canceled_org_guard before insert or update or delete on public.bookings
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.properties
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.dispute_messages
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.organization_invites
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.ical_feeds
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.maintenance_schedules
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.work_orders
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.supply_items
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.payout_imports
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.payout_lines
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.property_owners
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.property_financials
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.property_platform_listings
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.booking_guest_contacts
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.owner_statements
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.owner_expenses
  for each row execute function public.block_writes_if_org_canceled();
create trigger zz_canceled_org_guard before insert or update or delete on public.referral_wallet_entries
  for each row execute function public.block_writes_if_org_canceled();

create trigger zz_canceled_org_guard before insert or update or delete on public.photos
  for each row execute function public.block_photo_writes_if_org_canceled();
