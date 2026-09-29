-- Maintenance, separate from cleaning: standalone work orders not tied to
-- a cleaning booking, recurring preventative-maintenance schedules per
-- property, and an automatic work order when a booking gets a low
-- rating. Follows the same organization-scoping pattern as
-- properties/bookings (organization_id derived server-side from
-- property_id, never trusted from the client).

-- ---------------------------------------------------------------------
-- maintenance_schedules: recurring tasks (e.g. "replace HVAC filter every
-- 90 days"), independent of any booking. next_due_at is denormalized
-- (not computed on read) so "what's overdue" is a plain, indexable
-- filter, and so the maintenance-due cron can find work without scanning
-- every schedule's history.
-- ---------------------------------------------------------------------
create table public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  property_id uuid not null references public.properties (id) on delete cascade,
  title text not null,
  interval_days integer not null check (interval_days > 0),
  last_completed_at timestamptz,
  next_due_at date not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.maintenance_schedules_before_write()
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
  if new.next_due_at is null then
    new.next_due_at := current_date + new.interval_days;
  end if;
  return new;
end;
$$;

create trigger on_maintenance_schedules_before_write
  before insert or update on public.maintenance_schedules
  for each row execute function public.maintenance_schedules_before_write();

alter table public.maintenance_schedules enable row level security;

create policy "maintenance_schedules_select_own_org"
  on public.maintenance_schedules for select
  using (organization_id = public.my_org_id());

create policy "maintenance_schedules_staff_write"
  on public.maintenance_schedules for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- ---------------------------------------------------------------------
-- work_orders: a standalone maintenance task on a property. `source`
-- distinguishes one a staff member typed in by hand from one this system
-- generated on its own (a low rating, or an overdue preventative
-- schedule), so the UI can explain where it came from. `schedule_id`
-- links a preventative work order back to the schedule that spawned it,
-- so completing it can roll that schedule's due date forward
-- automatically (see the trigger below) -- the same whether it's
-- completed by staff or by the assigned cleaner.
-- ---------------------------------------------------------------------
create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  property_id uuid not null references public.properties (id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'in-progress', 'done')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  source text not null default 'manual' check (source in ('manual', 'low_rating', 'preventative')),
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  related_booking_id uuid references public.bookings (id) on delete set null,
  schedule_id uuid references public.maintenance_schedules (id) on delete set null,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.work_orders_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prop_org uuid;
  assignee_org uuid;
  sched_interval integer;
begin
  select organization_id into prop_org from public.properties where id = new.property_id;
  if prop_org is null then
    raise exception 'Property not found';
  end if;
  new.organization_id := prop_org;

  if new.assigned_to is not null then
    select organization_id into assignee_org from public.profiles where id = new.assigned_to;
    if assignee_org is distinct from new.organization_id then
      raise exception 'Cannot assign a work order to someone outside this organization';
    end if;
  end if;

  new.updated_at := now();

  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then
      new.completed_at := coalesce(new.completed_at, now());
      if new.schedule_id is not null then
        select interval_days into sched_interval
          from public.maintenance_schedules where id = new.schedule_id;
        if sched_interval is not null then
          update public.maintenance_schedules
            set last_completed_at = now(),
                next_due_at = current_date + sched_interval
            where id = new.schedule_id;
        end if;
      end if;
    end if;
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create trigger on_work_orders_before_write
  before insert or update on public.work_orders
  for each row execute function public.work_orders_before_write();

alter table public.work_orders enable row level security;

create policy "work_orders_select_own_org"
  on public.work_orders for select
  using (organization_id = public.my_org_id());

create policy "work_orders_staff_write"
  on public.work_orders for all
  using (public.is_admin() and organization_id = public.my_org_id())
  with check (public.is_admin() and organization_id = public.my_org_id());

-- A cleaner can move a work order assigned to them between
-- in-progress/done -- everything else about it (who it's assigned to,
-- its title, its property) stays staff-only, enforced here rather than
-- by RLS (which is row-level, not column-level), same as
-- cleaner_update_booking for bookings.
create or replace function public.update_own_work_order_status(p_id uuid, p_status text)
returns public.work_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  wo public.work_orders;
begin
  if p_status not in ('in-progress', 'done') then
    raise exception 'Invalid status';
  end if;

  select * into wo from public.work_orders where id = p_id;
  if wo.id is null then
    raise exception 'Work order not found';
  end if;
  if wo.assigned_to is distinct from auth.uid() then
    raise exception 'This work order is not assigned to you';
  end if;

  update public.work_orders set status = p_status where id = p_id returning * into wo;
  return wo;
end;
$$;

grant execute on function public.update_own_work_order_status(uuid, text) to authenticated;
