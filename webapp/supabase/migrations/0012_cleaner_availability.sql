-- Cleaner availability: a cleaner marks specific dates they're
-- unavailable (a day off, vacation, whatever) -- everything else
-- defaults to available. That matches how a small cleaning team
-- actually plans (exceptions are rarer than availability) better than
-- requiring a recurring weekly pattern to be filled in up front, and it
-- reuses the same calendar UI paradigm as the rest of the app.
create table public.cleaner_unavailable_dates (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (cleaner_id, date)
);

alter table public.cleaner_unavailable_dates enable row level security;

-- Self-service only, same as update_own_profile -- a cleaner manages
-- their own dates. Staff can see everyone's (to know before assigning a
-- job) but can't add or remove dates on a cleaner's behalf.
create policy "cleaner_unavailable_select"
  on public.cleaner_unavailable_dates for select
  using (public.is_admin() or cleaner_id = auth.uid());

create policy "cleaner_unavailable_insert"
  on public.cleaner_unavailable_dates for insert
  with check (cleaner_id = auth.uid());

create policy "cleaner_unavailable_delete"
  on public.cleaner_unavailable_dates for delete
  using (cleaner_id = auth.uid());
