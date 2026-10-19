-- Per-property turnover times, used by the Same-day conflict spotter
-- (Dashboard). Guests check out and in at set times; the spotter compares
-- the expected finish of a clean with the next guest's earliest check-in.
alter table public.properties add column if not exists checkout_time text not null default '10:00'
  check (checkout_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
alter table public.properties add column if not exists checkin_time text not null default '15:00'
  check (checkin_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
alter table public.properties add column if not exists timezone text not null default 'Australia/Sydney';
alter table public.properties add column if not exists clean_minutes integer not null default 120
  check (clean_minutes between 15 and 720);
