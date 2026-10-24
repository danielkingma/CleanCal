-- The Pro add-on's price changed from $19/month to $10/month (Stripe
-- side: a new Price on the existing "CleanCal Pro add-on" product,
-- since Stripe Prices are immutable -- see STRIPE_PRICE_PRO_ADDON in
-- .env.local.example). Nothing here changes behaviour; this just fixes
-- the hardcoded amount in update_dispatcher_enabled()'s own error
-- message from 0058_pro_gated_features.sql, which a plain comment edit
-- can't reach once a migration has already shipped.
create or replace function public.update_dispatcher_enabled(p_enabled boolean)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
begin
  if not public.is_admin() then
    raise exception 'Only an owner or manager can change this.';
  end if;
  if p_enabled and not public.org_has_pro() then
    raise exception 'The turnover dispatcher is part of the Pro add-on ($10/month) -- add it from My Profile > Billing first.';
  end if;
  update public.organizations set dispatcher_enabled = p_enabled where id = public.my_org_id() returning * into org;
  return org;
end;
$$;
