-- A cleaner who lands on the "start a new business" screen (e.g. an
-- invite link that didn't carry through) was being asked for a business
-- name before they could do anything -- confusing for someone who's
-- joining a team, not starting one. create_organization() now takes the
-- PERSON's own name (matching redeem_invite's p_name, added in
-- 0028_require_name_on_invite.sql), sets it on their profile immediately
-- the same way redeem_invite already does, and gives the new
-- organization a friendly placeholder name derived from it -- the actual
-- business name is set afterward from My Profile (new
-- update_organization_name() RPC below), Owner-only.
drop function if exists public.create_organization(text);

create or replace function public.create_organization(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
  existing_org_id uuid;
  trimmed_name text := trim(p_name);
begin
  if trimmed_name = '' then
    raise exception 'Enter your name to get started.';
  end if;

  select organization_id into existing_org_id from public.profiles where id = auth.uid();
  if existing_org_id is not null then
    raise exception 'You already belong to an organization.';
  end if;

  insert into public.organizations (name) values (trimmed_name || '''s Business') returning * into org;
  update public.profiles set organization_id = org.id, role = 'owner', name = trimmed_name where id = auth.uid();
  return org;
end;
$$;

grant execute on function public.create_organization(text) to authenticated;

create or replace function public.update_organization_name(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
  trimmed_name text := trim(p_name);
begin
  if trimmed_name = '' then
    raise exception 'Give your business a name.';
  end if;
  if not public.is_owner() then
    raise exception 'Only an owner can rename the business.';
  end if;

  update public.organizations set name = trimmed_name where id = public.my_org_id() returning * into org;
  return org;
end;
$$;

grant execute on function public.update_organization_name(text) to authenticated;
