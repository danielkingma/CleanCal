-- Cleaner payouts via Stripe Connect (Express accounts + Transfers) --
-- chosen over Stripe Treasury, which is a much heavier embedded-banking
-- product (its own approval process, holds balances/issues cards) not
-- needed just to pay a cleaner for a completed job.
--
-- Payout amount is per-property, not per-cleaner: whoever cleans a given
-- property is paid that property's rate.

alter table public.profiles
  add column stripe_connect_account_id text,
  add column stripe_connect_status text not null default 'not_started'
    check (stripe_connect_status in ('not_started', 'pending', 'active'));

alter table public.properties
  add column payout_rate_cents integer;

alter table public.bookings
  add column payout_status text not null default 'none'
    check (payout_status in ('none', 'paid')),
  add column stripe_transfer_id text;

-- Lets a signed-in cleaner record their own Connect account id right
-- after Stripe creates it (server action calls this before sending them
-- to the onboarding link), without a generic UPDATE on their row --
-- same shape as start_own_identity_verification (0014). Whether the
-- account can actually *receive* a payout (`stripe_connect_status =
-- 'active'`) is set only by the account.updated webhook, once Stripe
-- confirms onboarding is actually complete.
create or replace function public.start_own_connect_onboarding(p_account_id text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  update public.profiles
  set stripe_connect_account_id = p_account_id, stripe_connect_status = 'pending'
  where id = auth.uid();
  select * into p from public.profiles where id = auth.uid();
  return p;
end;
$$;

grant execute on function public.start_own_connect_onboarding(text) to authenticated;

-- Staff setting a property's payout rate is a plain column update,
-- already covered by properties_staff_update (0009) -- no new policy
-- needed, same reasoning as access_instructions.
--
-- Marking a booking paid (payout_status, stripe_transfer_id) is also a
-- plain column update on a row staff can already write via
-- bookings_admin_write (0001) -- the actual Stripe Transfer call is what
-- makes this safe to leave staff-writable rather than webhook-only
-- (unlike identity_status/stripe_connect_status, nothing here can be
-- used to grant money to yourself by editing a row; it only marks a
-- transfer that already happened).