-- Owner statements add-on, phases 2 and 3: expenses, saved (frozen)
-- statements, and private owner links. Staff-only RLS throughout; the
-- owner-facing page reads through the service role by unguessable token.

-- ---------------------------------------------------------------------
-- owner_expenses: costs charged against a property's owner on their
-- statement (repairs, supplies, rates, etc.).
-- ---------------------------------------------------------------------
create table public.owner_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  property_id uuid not null references public.properties (id) on delete cascade,
  expense_date date not null,
  description text not null check (length(trim(description)) > 0),
  amount_cents integer not null check (amount_cents >= 0),
  created_at timestamptz not null default now()
);

create index owner_expenses_property_date_idx on public.owner_expenses (property_id, expense_date);

create or replace function public.owner_expenses_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop_org uuid;
begin
  select organization_id into prop_org from public.properties where id = new.property_id;
  if prop_org is null or prop_org is distinct from public.my_org_id() then
    raise exception 'Property not found';
  end if;
  new.organization_id := prop_org;
  new.description := trim(new.description);
  return new;
end;
$$;

create trigger on_owner_expenses_before_write
  before insert or update on public.owner_expenses
  for each row execute function public.owner_expenses_before_write();

alter table public.owner_expenses enable row level security;

create policy "owner_expenses_staff_all"
  on public.owner_expenses for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- owner_statements: a saved statement for one client and period. The
-- snapshot is frozen at save time so later edits to fees, payouts or
-- expenses never silently change what an owner was already sent.
-- share_enabled + share_token power the private owner link.
-- ---------------------------------------------------------------------
create table public.owner_statements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  property_owner_id uuid not null references public.property_owners (id) on delete cascade,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  snapshot jsonb not null,
  share_token uuid not null default gen_random_uuid() unique,
  share_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_owner_id, period_start, period_end)
);

create or replace function public.owner_statements_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_org uuid;
begin
  select organization_id into owner_org from public.property_owners where id = new.property_owner_id;
  if owner_org is null or owner_org is distinct from public.my_org_id() then
    raise exception 'Client not found';
  end if;
  new.organization_id := owner_org;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_owner_statements_before_write
  before insert or update on public.owner_statements
  for each row execute function public.owner_statements_before_write();

alter table public.owner_statements enable row level security;

create policy "owner_statements_staff_all"
  on public.owner_statements for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());
