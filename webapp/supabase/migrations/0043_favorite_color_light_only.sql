-- A cleaner's favourite colour is only ever rendered as text sitting
-- directly on top of a booking bar's own background colour (amber
-- "to-clean", blue "in-progress", or dark teal "complete" -- see
-- .booking-bar.* in globals.css) -- never on a plain white/paper
-- background. A dark pick there is close to illegible (reported: a
-- cleaner's near-black colour was unreadable against the dark teal
-- "complete" bar). The picker in ProfileForm.tsx now only offers a
-- curated set of light swatches, but the format check added in
-- 0040_cleaner_initial_and_color.sql accepts any hex value, so this adds
-- a floor on brightness at the database level too -- the picker is a UI
-- nicety, this is what actually stops a dark value getting saved,
-- whatever client ends up calling update_own_profile.
--
-- Brightness is approximated as the average of the R/G/B byte values
-- (0-255 each); a flat "1/3 of the way to white" (170) floor is simple
-- and matches what the picker's swatches all clear by a wide margin.
create or replace function public.is_light_hex_color(color text)
returns boolean
language sql
immutable
as $$
  select color is null or (
    color ~ '^#[0-9a-fA-F]{6}$'
    and (
      get_byte(decode(substr(color, 2, 6), 'hex'), 0) +
      get_byte(decode(substr(color, 2, 6), 'hex'), 1) +
      get_byte(decode(substr(color, 2, 6), 'hex'), 2)
    ) >= 510
  )
$$;

-- Fix up any already-stored colour that wouldn't pass the new floor
-- (such as the dark teal-ish value reported as illegible) before adding
-- the constraint, so the migration doesn't fail against existing data.
-- Falls back to the first/default swatch in ProfileForm.tsx's
-- COLOR_SWATCHES -- the affected cleaner can still repick from there.
update public.profiles
set favorite_color = '#fef3c7'
where favorite_color is not null
  and not public.is_light_hex_color(favorite_color);

alter table public.profiles
  add constraint profiles_favorite_color_light check (public.is_light_hex_color(favorite_color));
