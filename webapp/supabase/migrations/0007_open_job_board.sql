-- Cleaner marketplace: open job board. Admins choose, per booking,
-- between reserving it for a specific cleaner (the existing "Assigned
-- cleaner" dropdown) or posting it open for any cleaner to claim -- the
-- "hybrid" model from the original spec, side by side rather than
-- picking one.

alter table public.bookings
  add column is_open_job boolean not null default false;

-- Cleaners can now also see open, unclaimed jobs across every property
-- (not just their own assignments), so they can browse and claim one.
-- Admins are unaffected.
drop policy if exists "bookings_select_own_or_admin" on public.bookings;

create policy "bookings_select_own_open_or_admin"
  on public.bookings for select
  using (
    public.is_admin()
    or assigned_cleaner_id = auth.uid()
    or (is_open_job and assigned_cleaner_id is null)
  );

-- Claiming and releasing are the only ways a cleaner can touch
-- assigned_cleaner_id, and both are atomic -- the UPDATE's WHERE clause
-- doubles as the check, so two cleaners racing to claim the same job
-- can't both succeed (the loser's UPDATE matches zero rows and raises).
create or replace function public.claim_open_booking(p_booking_id uuid)
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
    and is_open_job = true
    and assigned_cleaner_id is null
  returning * into b;

  if b.id is null then
    raise exception 'This job is no longer available.';
  end if;

  return b;
end;
$$;

grant execute on function public.claim_open_booking(uuid) to authenticated;

create or replace function public.release_open_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
begin
  update public.bookings
  set assigned_cleaner_id = null
  where id = p_booking_id
    and is_open_job = true
    and assigned_cleaner_id = auth.uid()
  returning * into b;

  if b.id is null then
    raise exception 'You can only release a job you claimed from the open board.';
  end if;

  return b;
end;
$$;

grant execute on function public.release_open_booking(uuid) to authenticated;
