-- Labor-performance trends and cross-property benchmarking (Reports)
-- need something Reports never had before: how long a clean actually
-- took. Adds two timestamps to bookings, stamped the first time (and
-- only the first time -- a later edit never overwrites them) a cleaner
-- moves their own job through cleaner_update_booking (0001_init.sql,
-- reshaped in 0020_cleaner_full_calendar.sql): "in-progress" stamps
-- cleaning_started_at, "complete" stamps cleaning_completed_at.
--
-- Deliberately NOT stamped when staff edit a booking's status directly
-- (updateBookingAdmin in calendar/actions.ts, a plain UPDATE outside
-- this RPC) -- that path is for corrections/overrides, not a real
-- cleaning session, and stamping it would understate how long jobs
-- actually take. The practical effect: duration data only exists for
-- jobs a cleaner ran through their own phone from here on. Every
-- already-completed booking has both columns null, same as a rating
-- can be null -- Reports treats missing duration the same way it
-- already treats a missing rating.
alter table public.bookings
  add column cleaning_started_at timestamptz,
  add column cleaning_completed_at timestamptz;

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
    update public.bookings
    set status = p_status,
        updated_at = now(),
        cleaning_started_at = case
          when p_status = 'in-progress' and cleaning_started_at is null then now()
          else cleaning_started_at
        end,
        cleaning_completed_at = case
          when p_status = 'complete' and cleaning_completed_at is null then now()
          else cleaning_completed_at
        end
    where id = p_booking_id;
  end if;

  if p_checklist is not null then
    update public.bookings set checklist = p_checklist, updated_at = now() where id = p_booking_id;
  end if;

  select * into b from public.bookings where id = p_booking_id;
  return b;
end;
$$;
