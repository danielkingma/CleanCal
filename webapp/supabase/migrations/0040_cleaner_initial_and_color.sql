-- A booking bar on a short stay (especially in the month mini-grid) only
-- has room for a couple of characters before a cleaner's full name gets
-- cut off mid-word. A short, self-chosen "preferred initial" (1-2
-- characters, e.g. "FM" or "F") stands in for the name in that spot
-- instead. A favourite colour is separate -- used only in the dedicated
-- Assigned/Completed lists, which have room to show the full name and
-- benefit from a quick way to tell cleaners apart at a glance.
alter table public.profiles
  add column if not exists preferred_initial text,
  add column if not exists favorite_color text;

alter table public.profiles
  add constraint profiles_preferred_initial_length check (char_length(preferred_initial) <= 2);

-- A colour swatch value, not free text -- constrained to a hex code so a
-- bad value can never end up as a broken inline `style` on the calendar.
alter table public.profiles
  add constraint profiles_favorite_color_format check (favorite_color ~ '^#[0-9a-fA-F]{6}$');

-- Replaces update_own_profile (0025_sms_notifications.sql) with a version
-- that also takes the new initial/colour. Still deliberately excludes
-- `role`, same as before.
drop function if exists public.update_own_profile(text, text, text, text, boolean);

create or replace function public.update_own_profile(
  p_name text,
  p_bio text,
  p_phone text,
  p_service_area text,
  p_sms_opt_in boolean,
  p_preferred_initial text default null,
  p_favorite_color text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  trimmed_initial text := nullif(trim(p_preferred_initial), '');
  trimmed_color text := nullif(trim(p_favorite_color), '');
begin
  update public.profiles
  set name = p_name,
      bio = p_bio,
      phone = p_phone,
      service_area = p_service_area,
      sms_opt_in = p_sms_opt_in,
      preferred_initial = trimmed_initial,
      favorite_color = trimmed_color
  where id = auth.uid();
  select * into p from public.profiles where id = auth.uid();
  return p;
end;
$$;

grant execute on function public.update_own_profile(text, text, text, text, boolean, text, text) to authenticated;
