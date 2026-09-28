-- SMS notifications, layered on top of the existing `phone` field the
-- same way push notifications sit on top of push_subscriptions
-- (0013_push_subscriptions.sql): best-effort, and inert until Twilio
-- credentials are configured (see src/lib/sms.ts). A phone number alone
-- doesn't imply consent to text it -- sms_opt_in is a separate, explicit
-- checkbox on the Profile page, off by default.
alter table public.profiles
  add column sms_opt_in boolean not null default false;

-- Replaces update_own_profile (0006_cleaner_profiles_and_ratings.sql)
-- with a version that also takes the new opt-in flag. Still deliberately
-- excludes `role`, same as before.
drop function if exists public.update_own_profile(text, text, text, text);

create or replace function public.update_own_profile(
  p_name text,
  p_bio text,
  p_phone text,
  p_service_area text,
  p_sms_opt_in boolean
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
  set name = p_name, bio = p_bio, phone = p_phone, service_area = p_service_area, sms_opt_in = p_sms_opt_in
  where id = auth.uid();
  select * into p from public.profiles where id = auth.uid();
  return p;
end;
$$;

grant execute on function public.update_own_profile(text, text, text, text, boolean) to authenticated;
