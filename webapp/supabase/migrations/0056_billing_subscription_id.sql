-- Subscription billing, step 1.
--
-- organizations.stripe_customer_id has existed since 0016_organizations.sql
-- but nothing has ever written to it -- there's no generic write policy on
-- organizations (see 0016's comment: "an organization's own row only ever
-- changes" through a security-definer RPC), and billing wasn't built yet.
-- This adds the missing piece it was always going to need
-- (stripe_subscription_id, to track the live Subscription a Checkout
-- session creates, separately from the Customer) and the RPC that lets
-- the owner's own billing-checkout server action record the Stripe
-- customer id once it creates one -- same shape as
-- start_own_connect_onboarding (0015_cleaner_payouts.sql).
--
-- subscription_status itself is NOT set here: that field already exists
-- (0016) and from here on is kept in sync only by the Stripe webhook
-- (checkout.session.completed / customer.subscription.updated/deleted),
-- same reasoning as stripe_connect_status -- a value that gates whether
-- money moves should never be settable by a plain owner-initiated RPC.
alter table public.organizations
  add column stripe_subscription_id text;

create or replace function public.start_own_organization_billing(p_customer_id text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
  org_id uuid := public.my_org_id();
begin
  if org_id is null or not public.is_owner() then
    raise exception 'Only the organization owner can manage billing.';
  end if;

  update public.organizations
  set stripe_customer_id = p_customer_id
  where id = org_id and stripe_customer_id is null; -- never overwrite an existing customer

  select * into org from public.organizations where id = org_id;
  return org;
end;
$$;

grant execute on function public.start_own_organization_billing(text) to authenticated;
