-- A business that signs up through a referral link gets a one-off welcome
-- credit of $20 in its own wallet (in-app credit only, never cash; usable
-- against its own CleanCal subscription).
alter table public.referral_wallet_entries drop constraint if exists referral_wallet_entries_kind_check;
alter table public.referral_wallet_entries
  add constraint referral_wallet_entries_kind_check
  check (kind in ('referral_credit', 'referred_credit', 'adjustment', 'spend'));

create unique index if not exists referral_wallet_one_welcome_per_referral
  on public.referral_wallet_entries (referral_id) where kind = 'referred_credit';

create or replace function public.record_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := public.my_org_id();
  referrer uuid;
  new_id uuid;
  code text := upper(trim(coalesce(p_code, '')));
begin
  if me is null or code = '' then
    return false;
  end if;
  select id into referrer from public.organizations where referral_code = code;
  if referrer is null or referrer = me then
    return false;
  end if;
  if exists (select 1 from public.referrals where referred_org_id = me) then
    return false;
  end if;
  if (select created_at from public.organizations where id = me) < now() - interval '2 days' then
    return false;
  end if;
  insert into public.referrals (referrer_org_id, referred_org_id) values (referrer, me) returning id into new_id;
  insert into public.referral_wallet_entries (organization_id, amount_cents, kind, referral_id, note)
  values (me, 2000, 'referred_credit', new_id, 'Welcome credit for joining through a referral');
  return true;
end;
$$;
grant execute on function public.record_referral(text) to authenticated;

-- Give the welcome credit to businesses already referred before this change.
insert into public.referral_wallet_entries (organization_id, amount_cents, kind, referral_id, note)
select r.referred_org_id, 2000, 'referred_credit', r.id, 'Welcome credit for joining through a referral'
from public.referrals r
where not exists (
  select 1 from public.referral_wallet_entries w where w.referral_id = r.id and w.kind = 'referred_credit'
);
