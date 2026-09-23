-- Web Push subscriptions: one row per browser/device a user has enabled
-- notifications on (a user can have several -- phone + laptop). Self-
-- service only, same shape as cleaner_unavailable_dates -- a user manages
-- their own rows and nobody else's. Sending a push happens server-side
-- with the service-role client (see src/lib/push.ts), which is the only
-- code path that ever reads across users, so there's no staff-visibility
-- policy here the way there is on cleaner_unavailable_dates.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

-- Needed for the resubscribe case: the client upserts on conflict with
-- the (unique) endpoint, which requires update permission alongside
-- insert whenever that endpoint's row already exists.
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

-- Lets any authenticated caller (e.g. a cleaner declining a job, or
-- posting a dispute message) find who to notify -- Owner/Manager profile
-- ids -- without granting them general read access to other users'
-- profile rows (profiles_select_own_or_admin restricts that to admins).
-- Returns ids only, nothing else about those users.
create or replace function public.staff_user_ids()
returns setof uuid
language sql
security definer
set search_path = public
as $$
  select id from public.profiles where role in ('owner', 'manager');
$$;

grant execute on function public.staff_user_ids() to authenticated;
