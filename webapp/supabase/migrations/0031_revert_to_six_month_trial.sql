-- Reverts 0030_one_month_trial.sql: pricing went back to how it was
-- before (free trial mentioned only on the 1-3 property tier, 6 months
-- long), so new organizations should go back to a 6-month trial too.
-- Same as 0030, this only changes the default for organizations created
-- from here on -- it doesn't touch trial_ends_at on any organization
-- that already exists (including one created while the 1-month default
-- from 0030 was live).
create or replace function public.create_organization(p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  org public.organizations;
  existing_org_id uuid;
begin
  select organization_id into existing_org_id from public.profiles where id = auth.uid();
  if existing_org_id is not null then
    raise exception 'You already belong to an organization.';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Give your business a name.';
  end if;

  insert into public.organizations (name, trial_ends_at)
    values (trim(p_name), now() + interval '6 months')
    returning * into org;
  update public.profiles set organization_id = org.id, role = 'owner' where id = auth.uid();
  return org;
end;
$$;
