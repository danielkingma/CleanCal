-- Shortens the free trial new organizations start with from 6 months
-- (0017_trial_period.sql) to 1 month, matching the pricing now shown on
-- the landing page and Handbook: every property-count tier gets the same
-- free first month, not just the smallest one. This only changes the
-- default for organizations created from here on -- it deliberately does
-- NOT touch trial_ends_at on organizations that already exist, so nobody
-- already mid-trial gets their trial window cut short underneath them.
-- (There's still no billing enforcement either way -- see TrialNotice.tsx
-- and the Handbook's pricing section -- so this only changes when the
-- in-app reminder banner starts showing, not anyone's actual access.)
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
    values (trim(p_name), now() + interval '1 month')
    returning * into org;
  update public.profiles set organization_id = org.id, role = 'owner' where id = auth.uid();
  return org;
end;
$$;
