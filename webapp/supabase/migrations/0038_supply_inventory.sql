-- Supply/inventory tracking: general consumables per property (toilet
-- paper, coffee, soap, ...) with a low-stock flag and a way for a
-- cleaner to report what they used up on a job, without giving them a
-- direct write policy on the table. Same organization-scoping pattern as
-- work_orders/maintenance_schedules (0037_maintenance.sql):
-- organization_id is derived server-side from property_id, never trusted
-- from the client.

create table public.supply_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  unit text not null default 'unit',
  quantity integer not null default 0 check (quantity >= 0),
  low_threshold integer not null default 2 check (low_threshold >= 0),
  last_restocked_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.supply_items_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop_org uuid;
begin
  select organization_id into prop_org from public.properties where id = new.property_id;
  if prop_org is null then
    raise exception 'Property not found';
  end if;
  new.organization_id := prop_org;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_supply_items_before_write
  before insert or update on public.supply_items
  for each row execute function public.supply_items_before_write();

alter table public.supply_items enable row level security;

-- Everyone in the org can see the supply list (a cleaner needs to know
-- what's already low before they show up, not just report new lows) --
-- writing it directly (add/rename/delete a line, change the threshold)
-- stays staff-only, same split as maintenance_schedules.
create policy "supply_items_select_own_org"
  on public.supply_items for select
  using (organization_id = public.my_org_id());

create policy "supply_items_staff_write"
  on public.supply_items for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- A cleaner (or anyone else) can report using some of an item up while
-- on a job, without needing a direct write policy that would also let
-- them rename items or change the low-stock threshold (RLS is row-level,
-- not column-level) -- same reasoning as update_own_work_order_status
-- and cleaner_update_booking. Quantity never goes below zero. Restocking
-- back up is a staff-only direct update (via supply_items_staff_write),
-- not this function.
create or replace function public.report_supply_usage(p_id uuid, p_used integer default 1)
returns public.supply_items
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.supply_items;
begin
  if p_used <= 0 then
    raise exception 'Amount used must be positive';
  end if;

  select * into item from public.supply_items where id = p_id and organization_id = public.my_org_id();
  if item.id is null then
    raise exception 'Supply item not found';
  end if;

  update public.supply_items
    set quantity = greatest(0, quantity - p_used)
    where id = p_id
    returning * into item;
  return item;
end;
$$;

grant execute on function public.report_supply_usage(uuid, integer) to authenticated;
