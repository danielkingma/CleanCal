# CleanCal — web app (Phases 1 & 2)

Real, hosted, multi-user rebuild of the CleanCal prototype: Next.js (App
Router) + Supabase (Postgres, Auth, and Storage), deployed to Vercel.

This covers Phases 1 and 2 of the build brief: project scaffold, database
schema, real auth with server-enforced roles, the Month/Week/Year calendar
UI ported from `cleancal-app.html`, real photo uploads, and cleaner-scoped
visibility.

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
  Supabase Realtime, so the calendar updates live across devices. Because
  Realtime re-checks the same RLS policy as a normal `SELECT`, a cleaner's
  subscription is automatically scoped the same way their initial fetch is.
- **Photo uploads** (`supabase/migrations/0002_photos_and_cleaner_scope.sql`):
  a private `booking-photos` Storage bucket, uploaded from the same "+"
  tile the prototype used. Objects are stored at `<booking_id>/<file>`, so
  storage RLS can check assignment without a join: admins can upload/delete
  anything, cleaners only on bookings assigned to them, and only the
  uploader (or an admin) can delete a given photo. Thumbnails render from
  short-lived signed URLs, not public links.
- **Cleaner-scoped visibility**: the `bookings` SELECT policy now only
  lets a cleaner see rows where `assigned_cleaner_id = auth.uid()` (admins
  still see everything). The calendar page also drops property rows a
  cleaner has no booking on, so their view isn't a wall of empty rows.
- The coral "!" attention badge reads `checklist.oven.outcome === "attention"`
  and lights up as soon as a cleaner (or admin) flags the oven that way.

## Not yet built (Phase 3, per the build brief)

- Airbnb / Vrbo / Booking.com API integration to auto-create bookings.
- Property access instructions (door codes, parking) visible to cleaners.

## Setup

### 1. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com) (the free
tier is enough to start).

### 2. Run the schema migrations

In the Supabase dashboard, open **SQL Editor** and run
`supabase/migrations/0001_init.sql`, then
`supabase/migrations/0002_photos_and_cleaner_scope.sql`, in that order.
Optionally also run `supabase/seed.sql` to seed the same demo properties
the prototype used.

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
  migrations/
    0001_init.sql                        schema + RLS policies + RPCs
    0002_photos_and_cleaner_scope.sql     storage bucket + cleaner-scoped RLS
  seed.sql                                optional demo properties
```
