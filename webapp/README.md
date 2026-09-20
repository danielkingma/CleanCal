# CleanCal — web app (Phases 1-3)

Real, hosted, multi-user rebuild of the CleanCal prototype: Next.js (App
Router) + Supabase (Postgres, Auth, and Storage), deployed to Vercel.

This covers Phases 1-3 of the build brief: project scaffold, database
schema, real auth with server-enforced roles, the Month/Week/Year calendar
UI ported from `cleancal-app.html`, real photo uploads, cleaner-scoped
visibility, calendar-feed sync, and per-property access instructions.

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

## Phase 3: calendar sync + access instructions

**A note on "the Airbnb/Vrbo/Booking.com API":** none of the three offer
self-serve developer signup for the calendar-sync API the build brief has
in mind — that requires applying as an approved PMS partner, a business
process, not something this session can complete for you. What all three
*do* offer today, and what every direct-booking site and booking plugin
also offers, is an **iCal calendar export URL**. So Phase 3 is built on
that: paste in any calendar's iCal link — an OTA's, or a client's own
booking site's — and CleanCal pulls it in on a schedule (or on demand) and
auto-creates bookings from it. It's the real, working version of "auto-create
bookings instead of manual entry," and it treats a personal booking site
exactly the same as an OTA: just another URL.

- **Where to find a property's iCal URL**: Airbnb (Calendar tab →
  Availability settings → Export calendar), Vrbo (Calendar → Import/Export
  calendar → Export), Booking.com (Extranet → Calendar → Sync calendars),
  or whatever the client's own direct-booking site/plugin calls "export"
  or "subscribe" to its calendar.
- **Where it's configured**: the new `/properties` page (admin only, linked
  from the calendar topbar). Each property has a free-text label + URL for
  as many feeds as it has (Airbnb, Vrbo, Booking.com, "My website" —
  anything), a "Sync now" per feed and a "Sync all feeds" button, and an
  access-instructions text box.
- **How sync works** (`src/lib/ical-sync.ts`, used by both the manual
  button and the optional cron job below): fetches the URL, parses each
  VEVENT's UID/dates, and upserts bookings keyed on `(property_id,
  external_uid)` — so re-syncing updates a reservation's dates instead of
  duplicating it, and never touches its cleaning status, checklist, or
  assigned cleaner once set. If a UID that was previously imported stops
  appearing in the feed (the guest may have cancelled), the booking is
  flagged (`ical_missing_since`, shown as a banner in the booking modal and
  a dashed outline on its calendar bar) rather than silently deleted —
  deleting it is left to an admin to confirm.
- **Automatic sync (optional)**: `vercel.json` defines a Cron Job hitting
  `/api/cron/sync-ical` once daily (Vercel's Hobby/free plan only allows
  daily cron jobs; bump the schedule in `vercel.json` if you're on Pro and
  want it more often). This route has no user session to
  authenticate with, so it uses a Supabase **service-role key** (bypasses
  RLS entirely) gated behind a `CRON_SECRET` you set yourself — see
  `.env.local.example`. Skip both env vars entirely if you'd rather just
  click "Sync now"/"Sync all feeds" — everything else works the same.
- **Access instructions**: door codes, parking, wifi — set per property on
  `/properties`, shown read-only inside the booking modal to whoever opens
  a booking at that property (including the assigned cleaner).

Still not built: nothing else from the brief remains — OTA integration and
access instructions were the only two Phase 3 items, and both are covered
above (OTA integration via the iCal mechanism rather than partner APIs).

## Setup

### 1. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com) (the free
tier is enough to start).

### 2. Run the schema migrations

In the Supabase dashboard, open **SQL Editor** and run, in order:
`0001_init.sql`, `0002_photos_and_cleaner_scope.sql`, then
`0003_ical_sync_and_access_instructions.sql` (all under
`supabase/migrations/`). Optionally also run `supabase/seed.sql` to seed
the same demo properties the prototype used.

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
    login/              magic-link sign-in page + server action
    auth/callback/       exchanges the magic-link code for a session
    logout/               POST route that signs the user out
    calendar/            the protected calendar page + booking server actions
    properties/          admin-only iCal feeds + access instructions page
    api/cron/sync-ical/   optional Vercel Cron target (service-role sync)
  components/
    CalendarApp.tsx       topbar, view state, realtime subscription
    Timeline.tsx           Month/Week property-row rendering
    YearView.tsx           Year mini-month grid
    BookingModal.tsx       new/edit booking form + role-gated fields
    PropertiesAdmin.tsx    per-property iCal feeds + access instructions UI
  lib/
    supabase/              browser/server/service-role client factories
    calendar-utils.ts      date math ported from the prototype
    ical.ts                minimal VEVENT (iCal) parser
    ical-sync.ts           shared fetch + upsert logic, used by button & cron
    types.ts               shared domain types
  proxy.ts                 auth guard (Next.js 16 renamed middleware -> proxy)
supabase/
  migrations/
    0001_init.sql                             schema + RLS policies + RPCs
    0002_photos_and_cleaner_scope.sql          storage bucket + cleaner-scoped RLS
    0003_ical_sync_and_access_instructions.sql  ical_feeds table + access_instructions
  seed.sql                                     optional demo properties
vercel.json                                    Cron schedule for auto-sync
```
