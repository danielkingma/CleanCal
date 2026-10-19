-- Referral points program.
--   * every organization gets a short referral code
--   * a new business that signs up through a referral link is recorded
--     (record_referral) against the referring organization
--   * when the referred business makes its first monthly payment, the
--     referrer's wallet is credited once (award_referral_credit -- callable
--     only with the service role: by the superadmin page now, and by the
--     billing webhook once CleanCal charges subscriptions)
--   * the wallet is an append-only ledger; balance = sum(amount_cents)

-- ---------------------------------------------------------------------
-- Referral codes
-- ---------------------------------------------------------------------
alter table public.organizations add column if not exists referral_code text;

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    exit when not exists (select 1 from public.organizations where referral_code = candidate);
  end loop;
  return candidate;
end;
$$;

update public.organizations set referral_code = public.generate_referral_code() where referral_code is null;

create unique index if not exists organizations_referral_code_key on public.organizations (referral_code);

create or replace function public.organizations_set_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists on_organizations_set_referral_code on public.organizations;
create trigger on_organizations_set_referral_code
  before insert on public.organizations
  for each row execute function public.organizations_set_referral_code();

-- ---------------------------------------------------------------------
-- referrals: one row per referred business. No client policies: it is
-- read through my_referrals() and written only by the functions below.
-- ---------------------------------------------------------------------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_org_id uuid not null references public.organizations (id) on delete cascade,
  referred_org_id uuid not null unique references public.organizations (id) on delete cascade,
  status text not null default 'signed_up' check (status in ('signed_up', 'paying')),
  credit_cents integer,
  created_at timestamptz not null default now(),
  first_paid_at timestamptz,
  check (referrer_org_id <> referred_org_id)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_org_id);
alter table public.referrals enable row level security;

-- ---------------------------------------------------------------------
-- Wallet ledger. Owners can read their own organization's entries;
-- nobody writes to it directly.
-- ---------------------------------------------------------------------
create table if not exists public.referral_wallet_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  amount_cents integer not null,
  kind text not null check (kind in ('referral_credit', 'adjustment', 'spend')),
  referral_id uuid references public.referrals (id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists referral_wallet_one_credit_per_referral
  on public.referral_wallet_entries (referral_id) where kind = 'referral_credit';
create index if not exists referral_wallet_org_idx on public.referral_wallet_entries (organization_id, created_at);
alter table public.referral_wallet_entries enable row level security;

drop policy if exists "referral_wallet_owner_select" on public.referral_wallet_entries;
create policy "referral_wallet_owner_select"
  on public.referral_wallet_entries for select
  using (public.is_owner() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- record_referral: called right after a new business is created, with
-- the code from the referral link. Quietly does nothing for an unknown
-- code, a self-referral, a business already recorded, or a business that
-- isn't brand new.
-- ---------------------------------------------------------------------
create or replace function public.record_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := public.my_org_id();
  referrer uuid;
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
  insert into public.referrals (referrer_org_id, referred_org_id) values (referrer, me);
  return true;
end;
$$;
grant execute on function public.record_referral(text) to authenticated;

-- The referrer's own referrals, without naming the referred business.
create or replace function public.my_referrals()
returns table (id uuid, created_at timestamptz, status text, credit_cents integer, first_paid_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.created_at, r.status, r.credit_cents, r.first_paid_at
  from public.referrals r
  where public.is_admin() and r.referrer_org_id = public.my_org_id()
  order by r.created_at desc;
$$;
grant execute on function public.my_referrals() to authenticated;

-- ---------------------------------------------------------------------
-- award_referral_credit: the referred business made its first monthly
-- payment. Credits the referrer once (status flips to 'paying', and the
-- partial unique index above is the backstop). Service role only.
-- ---------------------------------------------------------------------
create or replace function public.award_referral_credit(p_referred_org_id uuid, p_amount_cents integer default 2000)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.referrals;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Credit must be more than zero.';
  end if;
  update public.referrals
     set status = 'paying', first_paid_at = coalesce(first_paid_at, now()), credit_cents = p_amount_cents
   where referred_org_id = p_referred_org_id and status = 'signed_up'
   returning * into r;
  if r.id is null then
    return false;
  end if;
  insert into public.referral_wallet_entries (organization_id, amount_cents, kind, referral_id, note)
  values (r.referrer_org_id, p_amount_cents, 'referral_credit', r.id, 'Referral started paying');
  return true;
end;
$$;
revoke all on function public.award_referral_credit(uuid, integer) from public, anon, authenticated;
grant execute on function public.award_referral_credit(uuid, integer) to service_role;
