-- A team member's home address -- self-entered from My Profile, same as
-- bio/phone/service_area. Distinct from the existing free-text
-- `service_area` (a loose "where I'll take jobs" description, not
-- necessarily a real address) -- this is meant to eventually support
-- real distance-based ranking in the turnover dispatcher
-- (src/lib/dispatcher.ts), once properties also have a location and a
-- geocoding step exists to turn either into coordinates. Neither of
-- those exists yet -- see docs/TURNOVER_DISPATCHER.md -- so for now this
-- is just collected and shown on the Cleaners directory like phone and
-- service_area already are; nothing reads it yet.
alter table public.profiles add column address text;

-- Replaces update_own_profile (0042_split_name_fields.sql), adding
-- p_address the same way p_favorite_color was added before it: a new
-- optional parameter at the end, defaulting to null, so this is a
-- backward-compatible superset rather than a breaking signature change.
drop function if exists public.update_own_profile(text, text, text, text, text, text, boolean, text);

create or replace function public.update_own_profile(
  p_given_name text,
  p_middle_name text,
  p_surname text,
  p_bio text,
  p_phone text,
  p_service_area text,
  p_sms_opt_in boolean,
  p_favorite_color text default null,
  p_address text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  trimmed_given text := trim(p_given_name);
  trimmed_middle text := nullif(trim(p_middle_name), '');
  trimmed_surname text := nullif(trim(p_surname), '');
  trimmed_color text := nullif(trim(p_favorite_color), '');
  full_name text;
  computed_initial text;
begin
  if trimmed_given = '' then
    raise exception 'Enter your given name.';
  end if;

  full_name := trim(
    trimmed_given
    || case when trimmed_middle is not null then ' ' || trimmed_middle else '' end
    || case when trimmed_surname is not null then ' ' || trimmed_surname else '' end
  );

  computed_initial :=
    upper(left(trimmed_given, 1))
    || case when trimmed_middle is not null then upper(left(trimmed_middle, 1)) else '' end
    || case when trimmed_surname is not null then upper(left(trimmed_surname, 1)) else '' end;

  update public.profiles
  set given_name = trimmed_given,
      middle_name = trimmed_middle,
      surname = trimmed_surname,
      name = full_name,
      preferred_initial = computed_initial,
      bio = p_bio,
      phone = p_phone,
      service_area = p_service_area,
      sms_opt_in = p_sms_opt_in,
      favorite_color = trimmed_color,
      address = nullif(trim(p_address), '')
  where id = auth.uid();
  select * into p from public.profiles where id = auth.uid();
  return p;
end;
$$;

grant execute on function public.update_own_profile(text, text, text, text, text, text, boolean, text, text) to authenticated;
