-- Signup can now be as an individual or as a business/company.
-- create_organization() keeps taking the PERSON's own name (p_name, set on
-- their profile) and gains an optional business or company name:
--   * business name given -> the organization is named that
--   * no business name    -> the organization is named after the person
--     (it used to be "<name>'s Business"; either way an Owner can rename
--     it from My Profile via update_organization_name()).
drop function if exists public.create_organization(text);

create or replace function public.create_organization(p_name text, p_business_name text default null)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
  existing_org_id uuid;
  trimmed_name text := trim(p_name);
  trimmed_business text := nullif(trim(coalesce(p_business_name, '')), '');
begin
  if trimmed_name = '' then
    raise exception 'Enter your name to get started.';
  end if;
  if char_length(trimmed_name) > 120 or char_length(coalesce(trimmed_business, '')) > 120 then
    raise exception 'That name is too long.';
  end if;

  select organization_id into existing_org_id from public.profiles where id = auth.uid();
  if existing_org_id is not null then
    raise exception 'You already belong to an organization.';
  end if;

  insert into public.organizations (name) values (coalesce(trimmed_business, trimmed_name)) returning * into org;
  update public.profiles set organization_id = org.id, role = 'owner', name = trimmed_name where id = auth.uid();
  return org;
end;
$$;

grant execute on function public.create_organization(text, text) to authenticated;
