-- Splits the single "Name" field on My Profile into Given/Middle/Surname,
-- so the preferred initial (0040_cleaner_initial_and_color.sql) can be
-- derived automatically from them instead of typed by hand -- one letter
-- per filled part, e.g. "Daniel" + "Jacob" + "Kingma" -> "DJK", and no
-- middle initial at all when middle_name is left blank.
alter table public.profiles
  add column if not exists given_name text,
  add column if not exists middle_name text,
  add column if not exists surname text;

-- One-time split of whatever's already in `name` so existing accounts
-- aren't left blank: first word -> given name, last word -> surname,
-- anything in between -> middle name. Each person can correct this from
-- My Profile afterwards if the guess is wrong (e.g. a single-word name,
-- or a surname that's actually two words).
update public.profiles
set given_name = coalesce(given_name, split_part(trim(name), ' ', 1)),
    surname = coalesce(
      surname,
      case
        when array_length(regexp_split_to_array(trim(name), '\s+'), 1) > 1
          then (regexp_split_to_array(trim(name), '\s+'))[array_length(regexp_split_to_array(trim(name), '\s+'), 1)]
        else null
      end
    ),
    middle_name = coalesce(
      middle_name,
      case
        when array_length(regexp_split_to_array(trim(name), '\s+'), 1) > 2
          then array_to_string(
            (regexp_split_to_array(trim(name), '\s+'))[2:array_length(regexp_split_to_array(trim(name), '\s+'), 1) - 1],
            ' '
          )
        else null
      end
    )
where trim(coalesce(name, '')) <> '';

-- Up to 3 characters now (one per name part) instead of 2.
alter table public.profiles drop constraint if exists profiles_preferred_initial_length;
alter table public.profiles
  add constraint profiles_preferred_initial_length check (char_length(preferred_initial) <= 3);

-- Replaces update_own_profile (0040_cleaner_initial_and_color.sql).
-- Still deliberately excludes `role`, same as every version before it.
-- No longer takes a free-typed preferred initial -- it's now always
-- derived from the name parts below, never entered separately.
drop function if exists public.update_own_profile(text, text, text, text, boolean, text, text);

create or replace function public.update_own_profile(
  p_given_name text,
  p_middle_name text,
  p_surname text,
  p_bio text,
  p_phone text,
  p_service_area text,
  p_sms_opt_in boolean,
  p_favorite_color text default null
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
      favorite_color = trimmed_color
  where id = auth.uid();
  select * into p from public.profiles where id = auth.uid();
  return p;
end;
$$;

grant execute on function public.update_own_profile(text, text, text, text, text, text, boolean, text) to authenticated;
