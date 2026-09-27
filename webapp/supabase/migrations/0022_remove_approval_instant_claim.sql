-- Owner approval (0021_booking_request_approval.sql) turned out to be
-- more friction than it was worth: a cleaner ticking the box now claims
-- an unassigned/reassignable job immediately, the same as claiming one
-- off the open board, rather than sending a request an Owner/Manager has
-- to act on separately. If the wrong cleaner ends up on a job, an
-- Owner/Manager can already reassign it directly -- the "Assigned
-- cleaner" dropdown in the booking editor works on any booking, claimed
-- or not, with no change needed here.

drop function if exists public.approve_booking_request(uuid);
drop function if exists public.withdraw_booking_request(uuid);
drop function if exists public.request_booking_assignment(uuid);

alter table public.bookings drop column if exists requested_cleaner_id;

-- No longer needs to clear a request column on reassignment.
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

-- A cleaner ticking the box on a job that isn't confirmed as theirs --
-- works whether it has no cleaner at all or is currently assigned to
-- someone else who hasn't started it -- claims it immediately, same as
-- claim_open_booking (0007_open_job_board.sql) for the open board.
create or replace function public.claim_unassigned_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  update public.bookings
  set assigned_cleaner_id = auth.uid()
  where id = p_booking_id
    and is_open_job = false
    and status = 'to-clean'
    and assigned_cleaner_id is distinct from auth.uid()
  returning * into b;

  if b.id is null then
    raise exception 'This job can no longer be claimed.';
  end if;

  return b;
end;
$$;

grant execute on function public.claim_unassigned_booking(uuid) to authenticated;
