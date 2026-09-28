-- Owner-only: reveals org members' real email addresses on the Cleaners
-- page. Useful mainly because profiles.name defaults to the email's
-- local part at signup when no name is supplied (handle_new_user,
-- 0001_init.sql) -- until someone fills in a real name on their Profile
-- page, "name" alone can be a confusing, email-shaped placeholder rather
-- than an actual name, so the page shows the real email alongside it
-- instead of pretending that placeholder is a name.
--
-- profiles has no email column (it lives on auth.users, which ordinary
-- RLS-scoped clients can't read for anyone but themselves), so this is a
-- narrow SECURITY DEFINER function -- same shape as staff_user_ids() in
-- 0013_push_subscriptions.sql -- scoped to the caller's own organization
-- and gated to owners only (a Manager doesn't get this; matches the
-- "Owners see everything ... Managers get the same day-to-day access"
-- line already on the Cleaners page).
create or replace function public.org_member_emails()
returns table (id uuid, email text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only an owner can view member emails.';
  end if;

  return query
    select p.id, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.organization_id = public.my_org_id();
end;
$$;

grant execute on function public.org_member_emails() to authenticated;
