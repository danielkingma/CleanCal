-- Campaign codes: a shared code (used in CleanCal's outreach emails) that
-- works through the same ?ref= link as a referral code. A new business that
-- signs up with one gets the $20 welcome credit in its own wallet; there is
-- no referrer. In-app credit only, never cash.
create table if not exists public.campaign_codes (
  code text primary key check (code ~ '^[A-Z0-9]{6,12}$'),
  credit_cents integer not null default 2000 check (credit_cents > 0),
  label text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.campaign_codes enable row level security;
-- No policies: only the SECURITY DEFINER function below reads it.

insert into public.campaign_codes (code, credit_cents, label)
values ('CLEANCAL20', 2000, 'Outreach emails')
on conflict (code) do nothing;

-- One welcome credit per business, however it arrived.
create unique index if not exists referral_wallet_one_welcome_per_org
  on public.referral_wallet_entries (organization_id) where kind = 'referred_credit';

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
  camp public.campaign_codes;
  code text := upper(trim(coalesce(p_code, '')));
begin
  if me is null or code = '' then
    return false;
  end if;
  if (select created_at from public.organizations where id = me) < now() - interval '2 days' then
    return false;
  end if;
  if exists (select 1 from public.referrals where referred_org_id = me)
     or exists (select 1 from public.referral_wallet_entries where organization_id = me and kind = 'referred_credit') then
    return false;
  end if;

  select * into camp from public.campaign_codes where campaign_codes.code = record_referral.code and active;
  if camp.code is not null then
    insert into public.referral_wallet_entries (organization_id, amount_cents, kind, note)
    values (me, camp.credit_cents, 'referred_credit', 'Welcome credit (code ' || camp.code || ')');
    return true;
  end if;

  select id into referrer from public.organizations where referral_code = code;
  if referrer is null or referrer = me then
    return false;
  end if;
  insert into public.referrals (referrer_org_id, referred_org_id) values (referrer, me) returning id into new_id;
  insert into public.referral_wallet_entries (organization_id, amount_cents, kind, referral_id, note)
  values (me, 2000, 'referred_credit', new_id, 'Welcome credit for joining through a referral');
  return true;
end;
$$;
grant execute on function public.record_referral(text) to authenticated;
