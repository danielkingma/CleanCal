-- Starts the free trial clock: create_organization() (0016) left
-- trial_ends_at null, so nothing was ever counting down. New businesses
-- now get 6 months from signup; the one organization that already
-- existed before this migration gets the same 6 months starting now,
-- rather than backdating it to whenever it was actually created.

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

update public.organizations
set trial_ends_at = now() + interval '6 months'
where trial_ends_at is null;
