-- Sync back out: each property gets one exportable .ics feed containing
-- every booking on it (Airbnb-imported, Vrbo-imported, manual, open-job --
-- source doesn't matter, they're all occupied dates), so pasting that one
-- URL into every OTA's "import calendar" field lets each platform see
-- what's booked on the others via CleanCal as the hub. Without this,
-- CleanCal only pulls dates in -- it never told Airbnb about a Vrbo
-- booking, so a guest could double-book the same nights on two platforms.

create table public.ical_export_tokens (
  property_id uuid primary key references public.properties (id) on delete cascade,
  token uuid not null default gen_random_uuid() unique
);

alter table public.ical_export_tokens enable row level security;

-- Staff can see a property's export URL (to copy/paste into an OTA); no
-- generic insert/update/delete policy -- creation is automatic (trigger
-- below) and regeneration only happens through the RPC further down,
-- which checks is_admin() itself.
create policy "ical_export_tokens_select_staff"
  on public.ical_export_tokens for select
  using (public.is_admin());

create or replace function public.create_ical_export_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ical_export_tokens (property_id) values (new.id);
  return new;
end;
$$;

create trigger on_property_insert_create_export_token
  after insert on public.properties
  for each row execute function public.create_ical_export_token();

-- Backfill a token for every property that already existed.
insert into public.ical_export_tokens (property_id)
select id from public.properties
on conflict (property_id) do nothing;

-- Regenerating invalidates the old URL (any OTA still polling it starts
-- 404ing), so it's deliberately not a plain UPDATE the client can issue
-- itself -- this RPC is the only path, and it checks is_admin() itself
-- since there's no update policy on the table to lean on.
create or replace function public.regenerate_ical_export_token(p_property_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  update public.ical_export_tokens
    set token = gen_random_uuid()
    where property_id = p_property_id
    returning token into new_token;
  return new_token;
end;
$$;
