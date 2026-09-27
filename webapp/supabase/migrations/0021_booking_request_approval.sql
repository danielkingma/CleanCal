-- A job an Owner/Manager directly assigns to a specific cleaner used to
-- be locked to that cleaner from everyone else's point of view -- another
-- cleaner just saw "assigned to someone else, no details." Picking a
-- cleaner in the admin dropdown is now a starting suggestion rather than
-- an exclusive lock: every cleaner who isn't already confirmed onto a job
-- sees it as unassigned and can request it, and the Owner/Manager's
-- Approve is what actually finalizes who gets it. Deliberately separate
-- from the open job board (0007_open_job_board.sql), which stays
-- instant-claim with no approval step.

alter table public.bookings
  add column requested_cleaner_id uuid references public.profiles(id);

-- A stale request tied to a since-superseded assignment shouldn't
-- linger -- clears it whenever assigned_cleaner_id changes for any
-- reason (an Owner/Manager reassigning directly, or approve_booking_
-- request below setting it in the same statement anyway).
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
  if tg_op = 'UPDATE' and new.assigned_cleaner_id is distinct from old.assigned_cleaner_id then
    new.requested_cleaner_id := null;
  end if;
  return new;
end;
$$;

-- A cleaner asking to take a job that isn't already confirmed as theirs
-- -- works whether the booking has no cleaner at all or is currently
-- assigned to someone else who hasn't started it; either way it's a
-- request, not an instant claim (compare claim_open_booking, which stays
-- instant and only for the open board). Restricted to a job that hasn't
-- started yet, same as decline_assigned_booking.
create or replace function public.request_booking_assignment(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  update public.bookings
  set requested_cleaner_id = auth.uid()
  where id = p_booking_id
    and is_open_job = false
    and status = 'to-clean'
    and assigned_cleaner_id is distinct from auth.uid()
  returning * into b;

  if b.id is null then
    raise exception 'This job cannot be requested.';
  end if;

  return b;
end;
$$;

grant execute on function public.request_booking_assignment(uuid) to authenticated;

-- The "changed my mind" counterpart -- unchecking the box before the
-- Owner/Manager has acted on it.
create or replace function public.withdraw_booking_request(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  update public.bookings
  set requested_cleaner_id = null
  where id = p_booking_id
    and requested_cleaner_id = auth.uid()
  returning * into b;

  if b.id is null then
    raise exception 'No pending request to withdraw.';
  end if;

  return b;
end;
$$;

grant execute on function public.withdraw_booking_request(uuid) to authenticated;

-- Owner/Manager approves a pending request -- the moment the assignment
-- actually becomes real. assignment_confirmed is set true directly since
-- a cleaner asking for the job is its own confirmation, same as claiming
-- an open one.
create or replace function public.approve_booking_request(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  if not public.is_admin() then
    raise exception 'Only an owner or manager can approve a request.';
  end if;

  update public.bookings
  set assigned_cleaner_id = requested_cleaner_id,
      assignment_confirmed = true,
      requested_cleaner_id = null
  where id = p_booking_id
    and requested_cleaner_id is not null
  returning * into b;

  if b.id is null then
    raise exception 'No pending request on this job.';
  end if;

  return b;
end;
$$;

grant execute on function public.approve_booking_request(uuid) to authenticated;
