-- Cleaner ID verification via Stripe Identity -- the piece 0006's comment
-- flagged as needing a real third-party account before it could be built.
-- No new RLS policy needed: `profiles_select_own_or_admin` (0001) already
-- lets a cleaner read their own status and staff read everyone's, and the
-- status is only ever written by the Stripe webhook via the service-role
-- client (src/app/api/webhooks/stripe/route.ts), which bypasses RLS
-- entirely -- there's no client-writable path to it at all.

alter table public.profiles
  add column identity_status text not null default 'unverified'
    check (identity_status in ('unverified', 'pending', 'verified', 'failed')),
  add column stripe_identity_session_id text;

-- Lets a signed-in user record that they've *started* a verification
-- session (server action calls this right after creating the session
-- with Stripe) without granting them a generic UPDATE on their own row.
-- The *result* of verification (verified/failed) is never set here --
-- only the Stripe webhook can move status to 'verified' or 'failed',
-- via the service-role client, since that's the only source that's
-- actually confirmed a real ID document.
create or replace function public.start_own_identity_verification(p_session_id text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  update public.profiles
  set identity_status = 'pending', stripe_identity_session_id = p_session_id
  where id = auth.uid();
  select * into p from public.profiles where id = auth.uid();
  return p;
end;
$$;

grant execute on function public.start_own_identity_verification(text) to authenticated;
