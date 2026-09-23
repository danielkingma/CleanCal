-- Job acceptance/rejection: claiming/releasing an *open* job already
-- exists (0007_open_job_board.sql), but a cleaner directly assigned a
-- job by an Owner/Manager had no way to decline it -- only status/
-- checklist writes via cleaner_update_booking. Declining hands the job
-- back to the open pool for someone else to claim, same outcome as
-- releasing a claimed open job, rather than leaving it silently stuck
-- assigned to someone who isn't going to do it.
--
-- Only allowed while the job hasn't started (status = 'to-clean') --
-- backing out mid-clean is a dispute, not a decline.
create or replace function public.decline_assigned_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  update public.bookings
  set assigned_cleaner_id = null,
      is_open_job = true
  where id = p_booking_id
    and assigned_cleaner_id = auth.uid()
    and is_open_job = false
    and status = 'to-clean'
  returning * into b;

  if b.id is null then
    raise exception 'This job can no longer be declined.';
  end if;

  return b;
end;
$$;

grant execute on function public.decline_assigned_booking(uuid) to authenticated;
