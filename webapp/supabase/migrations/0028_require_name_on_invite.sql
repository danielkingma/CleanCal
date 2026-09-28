-- Requires a real name at the moment someone joins via an invite link,
-- instead of leaving profiles.name on its handle_new_user() default (the
-- email's local part -- see 0001_init.sql) until they happen to visit
-- the Profile page on their own, which most people never do. This is
-- the other half of org_member_emails (0027_org_member_emails.sql),
-- which was only needed as a workaround for exactly this gap.
drop function if exists public.redeem_invite(uuid);

create or replace function public.redeem_invite(p_token uuid, p_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.organization_invites;
  org public.organizations;
  existing_org_id uuid;
  trimmed_name text := trim(p_name);
begin
  if trimmed_name = '' then
    raise exception 'Enter your name to join.';
  end if;

  select organization_id into existing_org_id from public.profiles where id = auth.uid();
  if existing_org_id is not null then
    raise exception 'You already belong to an organization.';
  end if;

  select * into inv from public.organization_invites where token = p_token and redeemed_at is null;
  if inv.id is null then
    raise exception 'This invite link is invalid or has already been used.';
  end if;

  update public.profiles
  set organization_id = inv.organization_id, role = inv.role, name = trimmed_name
  where id = auth.uid();
  update public.organization_invites set redeemed_at = now(), redeemed_by = auth.uid() where id = inv.id;

  select * into org from public.organizations where id = inv.organization_id;
  return org;
end;
$$;

grant execute on function public.redeem_invite(uuid, text) to authenticated;
