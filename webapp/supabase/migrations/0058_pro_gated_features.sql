-- Gates the turnover dispatcher behind the Pro add-on
-- (organizations.pro_addon_active / statements_enabled, see
-- 0057_pro_addon.sql and src/lib/pro-access.ts's orgHasPro() for the
-- equivalent application-side check used by the other Pro features:
-- /reports benchmarking and the AI checklist photo reviewer).
--
-- Enforced here in the database, not just in the UI, same precedent as
-- is_admin() in update_dispatcher_enabled() itself -- a plain user session
-- calling the RPC directly can't bypass it either way.
create or replace function public.org_has_pro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(statements_enabled, false) or coalesce(pro_addon_active, false)
  from public.organizations
  where id = public.my_org_id();
$$;

-- Only gates *turning it on* -- an org that already has it enabled keeps
-- running exactly as before if Pro later lapses. Same reasoning as
-- pro_addon_active itself never being force-cleared by anything but a
-- real Stripe event: a feature grant silently disappearing out from under
-- someone's live automation would be a much worse surprise than it never
-- having required Pro retroactively. Revoking on lapse, if ever wanted,
-- is a deliberate follow-up, not a side effect of this migration.
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
    raise exception 'The turnover dispatcher is part of the Pro add-on ($19/month) -- add it from My Profile > Billing first.';
  end if;
  update public.organizations set dispatcher_enabled = p_enabled where id = public.my_org_id() returning * into org;
  return org;
end;
$$;

grant execute on function public.org_has_pro() to authenticated;
