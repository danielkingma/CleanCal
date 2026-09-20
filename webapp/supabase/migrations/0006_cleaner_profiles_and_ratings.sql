-- Cleaner marketplace, first slice: profiles + ratings. (Open job
-- board/claiming, background checks, and ID verification are separate,
-- larger pieces not covered here -- the latter two need their own
-- third-party accounts, e.g. Checkr and Stripe Identity/Persona, before
-- there's anything to integrate.)

alter table public.profiles
  add column bio text not null default '',
  add column phone text not null default '',
  add column service_area text not null default '';

-- Admin rates a cleaner's work on a booking. No new RLS needed -- this
-- is just two more columns on `bookings`, already covered by the
-- existing `bookings_admin_write` ALL policy (and readable via whatever
-- SELECT policy already applies, so a cleaner sees ratings left on their
-- own assigned bookings).
alter table public.bookings
  add column rating smallint check (rating between 1 and 5),
  add column rating_comment text not null default '';

-- Replaces update_own_name with a broader self-service profile update.
-- Still deliberately excludes `role` -- a cleaner still can't touch that
-- through this RPC, same as before.
drop function if exists public.update_own_name(text);

create or replace function public.update_own_profile(
  p_name text,
  p_bio text,
  p_phone text,
  p_service_area text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  update public.profiles
  set name = p_name, bio = p_bio, phone = p_phone, service_area = p_service_area
  where id = auth.uid();
  select * into p from public.profiles where id = auth.uid();
  return p;
end;
$$;

grant execute on function public.update_own_profile(text, text, text, text) to authenticated;
