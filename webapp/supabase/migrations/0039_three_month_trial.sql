-- Two things:
--
-- 1. Shortens the free trial from 6 months (0031_revert_to_six_month_
--    trial.sql) to 3 months, matching the pricing now shown on the
--    landing page and Handbook (the free property-count tier just
--    widened to 1-5; this narrows the free time window to match).
--
-- 2. Restores setting trial_ends_at at all: 0036_signup_asks_for_name_
--    not_business.sql replaced create_organization() to take the
--    person's own name instead of a business name, but in doing so
--    dropped the trial_ends_at column from the insert entirely --
--    meaning every organization created since that shipped got NO trial
--    end date (null), so TrialNotice.tsx's countdown banner has silently
--    never shown for any of them. Not intentional; fixed here.
--
-- As with every previous trial-length change (0030, 0031), this only
-- changes the default for organizations created from here on. It does
-- NOT shorten trial_ends_at on any organization that already has one
-- set -- nobody already mid-trial loses time underneath them. It DOES
-- backfill the organizations that got caught by the 0036 regression
-- (trial_ends_at is null solely because of that bug, not because they
-- were never meant to have one), giving them 3 months starting now
-- rather than backdating to whenever they actually signed up.
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

  insert into public.organizations (name, trial_ends_at)
    values (trimmed_name || '''s Business', now() + interval '3 months')
    returning * into org;
  update public.profiles set organization_id = org.id, role = 'owner', name = trimmed_name where id = auth.uid();
  return org;
end;
$$;

update public.organizations
set trial_ends_at = now() + interval '3 months'
where trial_ends_at is null;
