-- Third role: Manager. Sits between Owner (renamed from "admin" -- same
-- account, same access) and Cleaner: full day-to-day operational access,
-- but never financials (nothing built there yet, but this is where that
-- line goes once it exists), never role changes, never deleting a
-- property.

-- Widen the constraint before the data migration below -- otherwise the
-- UPDATE to 'owner' collides with the still-active old constraint, which
-- only allowed 'admin'/'cleaner'.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'manager', 'cleaner'));

update public.profiles set role = 'owner' where role = 'admin';

-- is_admin() is kept as the function name -- it's referenced by every
-- existing "admin-only" RLS policy across prior migrations (bookings,
-- properties select/insert/update, photos, ical_feeds, ...). Redefining
-- its body to mean "owner or manager" extends all of that reach to
-- managers automatically, with zero changes to those policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('owner', 'manager'),
    false
  );
$$;

-- Strictly the top role, for the handful of things Manager shouldn't do.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'owner',
    false
  );
$$;

-- Writing to a profile that isn't your own is, in practice, only ever
-- "change someone's role" -- so this whole policy (which used to be
-- is_admin()) narrows to is_owner(). Without this, redefining is_admin()
-- above would have quietly let managers grant themselves or anyone else
-- the owner role.
drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_owner_write"
  on public.profiles for all
  using (public.is_owner())
  with check (public.is_owner());

-- Properties: creating/editing stays staff-level (owner or manager), but
-- deleting a property is owner-only. Splitting the old single ALL policy
-- into three so DELETE alone can require is_owner() while INSERT/UPDATE
-- still use is_admin() (which now covers managers too).
drop policy if exists "properties_admin_write" on public.properties;

create policy "properties_staff_insert"
  on public.properties for insert
  with check (public.is_admin());

create policy "properties_staff_update"
  on public.properties for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "properties_owner_delete"
  on public.properties for delete
  using (public.is_owner());

-- dispute_messages.author_role is stamped straight from profiles.role by
-- the trigger in 0008 -- it'll now be 'owner' or 'manager' instead of
-- 'admin' for staff, so the old check constraint needs to widen too.
alter table public.dispute_messages drop constraint if exists dispute_messages_author_role_check;
alter table public.dispute_messages add constraint dispute_messages_author_role_check
  check (author_role in ('owner', 'manager', 'cleaner'));
