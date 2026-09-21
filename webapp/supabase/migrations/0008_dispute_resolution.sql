-- Dispute resolution: a lightweight flagging/comment thread tied to a
-- booking, so a cleaner or admin can raise an issue (property condition,
-- payment disagreement, etc.) for an admin to resolve.

alter table public.bookings
  add column dispute_status text not null default 'none' check (dispute_status in ('none', 'open', 'resolved'));

create table public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  author_name text not null default '',
  author_role text not null default 'cleaner' check (author_role in ('admin', 'cleaner')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.dispute_messages enable row level security;

-- Visible to admins, and to the cleaner a booking is assigned to -- same
-- reach as everything else scoped to "this booking is mine or I run
-- the place".
create policy "dispute_messages_select"
  on public.dispute_messages for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.assigned_cleaner_id = auth.uid()
    )
  );

create policy "dispute_messages_insert_admin"
  on public.dispute_messages for insert
  with check (public.is_admin() and author_id = auth.uid());

create policy "dispute_messages_insert_assigned_cleaner"
  on public.dispute_messages for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.assigned_cleaner_id = auth.uid()
    )
  );

-- author_name/author_role are always stamped from the real profile, not
-- whatever a caller sends, so nobody can post a message pretending to be
-- someone else or a different role.
create or replace function public.stamp_dispute_message_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = new.author_id;
  new.author_name := coalesce(p.name, 'Unknown');
  new.author_role := coalesce(p.role, 'cleaner');
  return new;
end;
$$;

create trigger on_dispute_message_insert_stamp
  before insert on public.dispute_messages
  for each row execute function public.stamp_dispute_message_author();

-- Any new message reopens the thread -- including a reply on one an
-- admin had marked resolved. Runs as the function owner, so it can
-- update `bookings` even for a cleaner whose own RLS otherwise grants no
-- generic UPDATE on that table.
create or replace function public.bump_dispute_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set dispute_status = 'open'
  where id = new.booking_id and dispute_status is distinct from 'open';
  return new;
end;
$$;

create trigger on_dispute_message_insert_bump
  after insert on public.dispute_messages
  for each row execute function public.bump_dispute_status();
