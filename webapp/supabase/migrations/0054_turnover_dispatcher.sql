-- Turnover dispatcher: automatic cleaner assignment for a brand-new
-- booking, and automatic reshuffling when an existing one's dates shift
-- and its current cleaner can no longer do it. Off by default per
-- organization -- see webapp/docs/TURNOVER_DISPATCHER.md for what it
-- does and doesn't do. The actual assignment logic lives in
-- src/lib/dispatcher.ts (pure ranking) and src/lib/ical-sync.ts (the
-- Supabase glue, run from inside syncOneFeed so it covers every sync
-- trigger -- the per-feed button, "sync all", and the cron route --
-- with one hook).

alter table public.organizations
  add column dispatcher_enabled boolean not null default false;

-- Owner OR manager (not owner-only like update_organization_name()) --
-- this is an operational switch in the same spirit as the per-property
-- turnover-times settings, which any staff member can already change,
-- not a financial or identity change.
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
  update public.organizations set dispatcher_enabled = p_enabled where id = public.my_org_id() returning * into org;
  return org;
end;
$$;

grant execute on function public.update_dispatcher_enabled(boolean) to authenticated;
