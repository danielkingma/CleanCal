-- claim_unassigned_booking (0022_remove_approval_instant_claim.sql) let
-- any cleaner instantly take over a job an Owner/Manager had already put
-- a *different* specific cleaner on, as long as that cleaner hadn't
-- started it yet -- its WHERE clause only required the caller not be the
-- current assignee, not that there be no assignee at all. That let one
-- cleaner silently bump another off a job they'd been given, which is
-- surprising rather than useful: the name in this function always meant
-- "unassigned", so make it actually require that.
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
    and assigned_cleaner_id is null
  returning * into b;

  if b.id is null then
    raise exception 'This job can no longer be claimed.';
  end if;

  return b;
end;
$$;

grant execute on function public.claim_unassigned_booking(uuid) to authenticated;
