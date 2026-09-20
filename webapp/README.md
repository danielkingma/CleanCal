# CleanCal — web app (Phase 1)

Real, hosted, multi-user rebuild of the CleanCal prototype: Next.js (App
Router) + Supabase (Postgres, Auth, and — from Phase 2 — Storage), deployed
to Vercel.

This covers Phase 1 of the build brief: project scaffold, database schema,
real auth with server-enforced roles, and the Month/Week/Year calendar UI
ported from `cleancal-app.html`.

## What's here

- **Auth**: Supabase magic-link sign-in (`/login`). Every signed-up user
  gets a `profiles` row via a database trigger, defaulting to the
  `cleaner` role.
- **Roles are enforced in Postgres, not the UI.** See
  `supabase/migrations/0001_init.sql`:
  - Admins get full CRUD on `properties` and `bookings` via an
    `is_admin()`-gated RLS policy.
  - Cleaners have **no** generic UPDATE policy on `bookings` — they can
    only change status/checklist through the `cleaner_update_booking()`
    RPC, which checks server-side that the booking is assigned to them
    before writing anything.
  - The UI disables fields cleaners shouldn't touch, but that's a
    convenience, not the security boundary — the boundary is the RPC and
    the RLS policies.
- **Calendar UI**: Month / Week / Year property-row timeline, angled
  booking bars (2pm check-in / 10am checkout), amber/blue/teal status
  colors, and the booking modal with the cleaning checklist + oven
  sub-flow, all ported from the prototype's proven layout and CSS.
- **Realtime**: booking changes broadcast to every connected client via
  Supabase Realtime, so the calendar updates live across devices.

## Not yet built (later phases, per the build brief)

- Real photo upload to Supabase Storage (the modal shows a placeholder
  note — the `photos` table and its RLS policies already exist and are
  ready for this).
- The coral "!" attention badge is wired up (it reads
  `checklist.oven.outcome`), but nothing yet drives it besides manually
  setting the oven outcome in the modal.
- Scoping cleaners' calendar view to only their assigned bookings (they
  can currently see all bookings, but can only edit ones assigned to
  them).
- OTA integrations (Airbnb/Vrbo/Booking.com) and property access
  instructions (Phase 3).

## Setup

### 1. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com) (the free
tier is enough to start).

### 2. Run the schema migration

In the Supabase dashboard, open **SQL Editor** and run the contents of
`supabase/migrations/0001_init.sql`. Optionally also run `supabase/seed.sql`
to seed the same demo properties the prototype used.

(If you use the [Supabase CLI](https://supabase.com/docs/guides/cli)
instead: `supabase link --project-ref <your-ref>` then
`supabase db push`.)

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
from your project's **Settings → API** page.

### 4. Bootstrap your first admin

Every new sign-up defaults to the `cleaner` role (least privilege). To
make yourself an admin, sign in once through the app, then in the SQL
Editor run:

```sql
update public.profiles set role = 'admin' where id =
  (select id from auth.users where email = 'you@example.com');
```

### 5. Run it

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, sign in via the magic-link email, and
you'll land on the calendar.

## Deploying

Push this repo to Vercel, add the two `NEXT_PUBLIC_SUPABASE_*` env vars
in the Vercel project settings, and deploy. In Supabase, add your
production URL under **Authentication → URL Configuration → Redirect
URLs** (`https://your-app.vercel.app/auth/callback`) so the magic-link
flow works in production.

## Project structure

```
src/
  app/
    login/            magic-link sign-in page + server action
    auth/callback/     exchanges the magic-link code for a session
    logout/            POST route that signs the user out
    calendar/          the protected calendar page + booking server actions
  components/
    CalendarApp.tsx     topbar, view state, realtime subscription
    Timeline.tsx         Month/Week property-row rendering
    YearView.tsx         Year mini-month grid
    BookingModal.tsx     new/edit booking form + role-gated fields
  lib/
    supabase/            browser/server Supabase client factories
    calendar-utils.ts    date math ported from the prototype
    types.ts             shared domain types
  proxy.ts               auth guard (Next.js 16 renamed middleware -> proxy)
supabase/
  migrations/0001_init.sql   schema + RLS policies + RPCs
  seed.sql                    optional demo properties
```
