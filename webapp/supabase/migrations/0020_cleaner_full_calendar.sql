-- The cleaner calendar previously showed only a cleaner's own assignments
-- plus the open job board -- narrower than what an Owner/Manager sees.
-- Cleaners now see the full portfolio schedule (so they can plan around
-- other jobs), while a directly-assigned job (as opposed to one they
-- claimed themselves off the open board) requires their active
-- confirmation before it counts as accepted, rather than being treated
-- as accepted the moment an Owner/Manager assigns it.

-- 1. Any authenticated member of an organization can now read every
--    booking in it -- matches properties_select_own_org (0016), which
--    already allows this for properties. Sensitive detail (guest name,
--    notes, rating, dispute) on a booking that isn't a cleaner's own and
--    isn't open is still kept out of the UI at the application layer
--    (BookingModal shows a minimal, read-only view for one of those) --
--    that's a UI restriction, not an RLS one; the raw row is fetched
--    like any other booking in this org.
drop policy if exists "bookings_select_own_open_or_admin" on public.bookings;
create policy "bookings_select_own_org"
  on public.bookings for select
  using (organization_id = public.my_org_id());

-- 2. Defaults true so every already-scheduled booking stays exactly as
--    it is today; only a *new* direct assignment starts out unconfirmed.
alter table public.bookings
  add column assignment_confirmed boolean not null default true;

-- A cleaner claiming an open job (or being newly self-assigned) is its
-- own confirmation; an Owner/Manager assigning someone else needs that
-- person to actively confirm before it counts as accepted.
create or replace function public.bookings_set_assignment_confirmed()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assigned_cleaner_id is not null
     and (tg_op = 'INSERT' or new.assigned_cleaner_id is distinct from old.assigned_cleaner_id) then
    new.assignment_confirmed := (auth.uid() = new.assigned_cleaner_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_bookings_set_assignment_confirmed on public.bookings;
create trigger on_bookings_set_assignment_confirmed
  before insert or update on public.bookings
  for each row execute function public.bookings_set_assignment_confirmed();

-- 3. The "yes" path for a pending direct assignment -- counterpart to
--    decline_assigned_booking (0011), which is the "no" path for the
--    same pending state (declining doesn't check assignment_confirmed;
--    it already works whether or not the job was ever confirmed).
create or replace function public.confirm_assigned_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  update public.bookings
  set assignment_confirmed = true
  where id = p_booking_id
    and assigned_cleaner_id = auth.uid()
    and is_open_job = false
    and assignment_confirmed = false
  returning * into b;

  if b.id is null then
    raise exception 'This job cannot be confirmed.';
  end if;

  return b;
end;
$$;

grant execute on function public.confirm_assigned_booking(uuid) to authenticated;

-- 4. A cleaner shouldn't be able to start working a job (status/checklist
--    writes) before confirming they're actually doing it.
create or replace function public.cleaner_update_booking(
  p_booking_id uuid,
  p_status text default null,
  p_checklist jsonb default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then
    raise exception 'booking not found';
  end if;
  if b.assigned_cleaner_id is distinct from auth.uid() then
    raise exception 'not assigned to this booking';
  end if;
  if not b.assignment_confirmed then
    raise exception 'Confirm this job before updating it.';
  end if;

  if p_status is not null then
    if p_status not in ('to-clean', 'in-progress', 'complete') then
      raise exception 'invalid status %', p_status;
    end if;
    update public.bookings set status = p_status, updated_at = now() where id = p_booking_id;
  end if;

  if p_checklist is not null then
    update public.bookings set checklist = p_checklist, updated_at = now() where id = p_booking_id;
  end if;

  select * into b from public.bookings where id = p_booking_id;
  return b;
end;
$$;
