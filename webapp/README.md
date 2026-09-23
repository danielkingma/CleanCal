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
- **Automatic sync (optional)**: `/api/cron/sync-ical` re-syncs every
  configured feed when hit with the right secret. It doesn't care who
  calls it, so rather than Vercel's own Cron Jobs (Hobby-plan accounts
  are limited to once daily — too infrequent for a 5-minute cadence), a
  **free external scheduler** works just as well:

  1. In Vercel project settings, add two environment variables:
     - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Settings → API Keys
       (the **secret**/service-role key, not the publishable one).
     - `CRON_SECRET` — any random string (`openssl rand -hex 32`).
     Redeploy after adding them (env var changes need a new deployment
     to take effect).
  2. At [cron-job.org](https://cron-job.org) (free, no card required),
     create an account and a new cron job:
     - URL: `https://<your-app>.vercel.app/api/cron/sync-ical`
     - Schedule: every 5 minutes (or whatever interval you want)
     - Under "Advanced" → request headers, add:
       `Authorization: Bearer <the CRON_SECRET value>`
  3. Check the job's execution log on cron-job.org for a `200` response,
     or watch `last_synced_at` update on a feed on the `/properties` page.

  This route has no user session to authenticate with, which is why it
  uses the service-role key (bypasses RLS entirely) — `CRON_SECRET` is
  what stands in for auth instead. Skip all of this entirely if you'd
  rather just click "Sync now"/"Sync all feeds" by hand — everything
  else works exactly the same either way.
- **Access instructions**: door codes, parking, wifi — set per property on
  `/properties`, shown read-only inside the booking modal to whoever opens
  a booking at that property (including the assigned cleaner).
- **Source badge on the calendar** (`src/lib/platform-badge.ts`): a synced
  booking gets a small colored left-edge stripe and letter badge showing
  which feed it came from. Recognizes Airbnb, Vrbo, Booking.com, Expedia,
  Agoda, Stayz, Trip.com/Ctrip, Xiaozhu, Tujia, 9flats, Casamundo,
  Interhome, NOVASOL, HomeToGo, Plum Guide, Furnished Finder, and Houfy,
  each with its own distinct color; any other feed label (a direct
  booking site, say) still gets a neutral badge from its first letter.
  This list is just pattern-matching on the feed's label text — syncing
  from any of them (or one not listed) already works today via the same
  generic iCal import on `/properties`; adding a platform here only gets
  it a recognizable color instead of the neutral fallback. This is
  intentionally separate from the bar's own amber/blue/teal background,
  which still means cleaning status, not source — the two aren't allowed
  to collide. It's letter badges + color, not the actual OTA logos, since
  those are trademarked assets this app has no rights to reproduce.

Everything from the build brief itself is covered — OTA integration and
access instructions were the only two Phase 3 items, and both are above
(OTA integration via the iCal mechanism rather than partner APIs).

## Beyond the brief: cleaner marketplace (first slice)

The original product spec (`docs/CleanCal_Platform_Specification.docx`)
describes a much larger cleaner marketplace — browsing/hiring gig
cleaners, ratings, background checks (Checkr), ID verification, dispute
resolution. That's a second product's worth of scope; what's built so far
is just the profile + ratings piece:

- **`/profile`** (any signed-in user): edit your own name, phone, service
  area, and bio. Deliberately can't touch your own `role` — that RPC
  (`update_own_profile`) only ever writes the other four columns.
- **`/cleaners`** (admin only): a read-only directory of every cleaner's
  profile plus their average rating and rated-job count.
- **Rating a cleaning**: once a booking's assigned and marked Complete,
  the booking modal shows a 1-5 star + comment rater (admin only). Ratings
  aren't a separate table — just two columns on `bookings` — so they're
  already scoped to whoever can see that booking under existing RLS.
- The "Assigned cleaner" dropdown in the booking modal shows each
  cleaner's average rating next to their name, so assignment already
  benefits from ratings without a separate browsing/job-board UI.

## Open job board (slice 2)

Per-booking, an admin now chooses between the two halves of the "hybrid"
model from the original spec, side by side rather than picking one:

- **Reserved** (the original behavior): pick a specific cleaner from the
  dropdown, same as before.
- **Open — any cleaner can claim**: the booking goes into a shared,
  unclaimed pool. Any cleaner sees it (a dashed teal outline and an
  "Open" label on the calendar bar, on top of their own assignments) and
  can claim it from the booking modal. First to claim it wins — claiming
  is one atomic `UPDATE ... WHERE assigned_cleaner_id IS NULL` in
  Postgres (`claim_open_booking`), so two cleaners racing for the same
  job can't both succeed. A cleaner who can no longer do a job they
  claimed can release it back into the pool (`release_open_booking`) for
  someone else to pick up.

Cleaners' visibility into `bookings` was broadened accordingly (still
enforced in RLS, not just the query): they now see their own assignments
*plus* any open, unclaimed job across every property, but never another
cleaner's specific assignment.

## Dispute resolution (slice 3)

A lightweight comment thread on a booking, for a cleaner or admin to
flag an issue (property condition, payment disagreement, whatever) for
an admin to resolve:

- Shows up in the booking modal for admin, or the cleaner it's assigned
  to — nobody else. Backed by a `dispute_messages` table rather than
  free-text on the booking itself, so it's an actual back-and-forth
  thread, not a single field either side overwrites.
- `bookings.dispute_status` (`none` / `open` / `resolved`) drives a
  small pill in the modal and a blue "!" badge on the calendar bar so an
  open dispute is visible without opening every booking.
- Posting a message — by either side — always sets status back to
  `open`, including reopening one an admin had marked resolved. That
  transition runs in a Postgres trigger (`bump_dispute_status`), not
  application code, so it fires the same way regardless of who's
  posting; a cleaner has no generic UPDATE access to `bookings`, so this
  couldn't work as a plain client-side "insert then update" without it.
- Each message's author name and role are stamped server-side from the
  real `profiles` row at insert time (another trigger,
  `stamp_dispute_message_author`) rather than trusted from the client,
  so nobody can post a message under a different name or role.
- "Mark resolved" is admin-only, enforced the same way as every other
  admin-only write here: a plain `bookings` update covered by the
  existing `bookings_admin_write` RLS policy, nothing new needed for it.

That's everything from the ordered marketplace list except background
checks and ID verification — see **Backlog** below.

## Owner / Manager / Cleaner roles (slice 4)

A third role, so an owner can hand day-to-day running of the account to
someone else without handing over everything:

- **Owner** (renamed from `admin` — same account, same access, existing
  admins are migrated automatically). Everything a Manager can do, plus
  the two things kept exclusive: changing anyone's role, and deleting a
  property.
- **Manager**: full operational access — properties, calendar feeds,
  bookings, assigning/rating cleaners, resolving disputes, the works.
  This is also where an income/financials feature would draw the line
  once one exists, per the brief that prompted this.
- **Cleaner**: unchanged.
- `is_admin()` (used throughout the RLS policies from every earlier
  migration) is redefined to mean "owner or manager," so the existing
  policies extend to Manager automatically. A separate `is_owner()`
  covers the two Owner-only cases via their own narrower policies
  (`profiles_owner_write`, `properties_owner_delete`).
- **Team roles**, on `/cleaners` (Owner only): every account with a role
  dropdown next to it. Changing a role calls `updateUserRole`, which is
  really just enforced by `profiles_owner_write` RLS — a Manager who
  somehow called it directly would just get a permission error back.
  You can't change your own role, so you can't lock yourself out.

## Calendar export — sync back out (slice 5)

Phase 3's iCal sync only pulls dates *in*: CleanCal never told Airbnb
about a booking that came from Vrbo, so the same nights could still get
double-booked on a platform that doesn't know about it. This closes the
loop — each property now also *exports* a feed of everything booked on
it, source included, so pasting that one URL into every OTA's "connect
to another website" step makes CleanCal the hub all of them sync
through:

- **`/api/ical/<token>`**: a public, unauthenticated `.ics` feed — an
  OTA's calendar importer can't log in, so an unguessable per-property
  token in the URL stands in for auth instead (same idea as
  `CRON_SECRET` on the sync route). Lists every booking on that property
  regardless of source (Airbnb-imported, Vrbo-imported, manual, open-job)
  as a plain "Reserved" block; a booking flagged `ical_missing_since`
  (the guest may have cancelled) is left out until an admin confirms it.
- **Where to find it**: the "Calendar export" field on each property
  card on `/properties`, with a Copy button. Paste it into Airbnb's
  Calendar → Connect to another website (Step 2 in their UI — "Other
  website link"), Vrbo, Booking.com, or a direct-booking site's own
  "import calendar" field, same as you'd paste any other iCal link.
- **Regenerate link**: rotates the token, so the old URL immediately
  404s — for if a link leaked or you're moving a property between
  accounts. You'd need to re-paste the new one into every OTA that had
  the old one.
- The token lives in its own `ical_export_tokens` table rather than a
  plain column on `properties`, specifically so it's *not* covered by
  the existing "any signed-in user can read properties" policy —
  reading it requires `is_admin()` (staff), and only the
  `regenerate_ical_export_token()` RPC can change it (checks `is_admin()`
  itself; there's no update policy on the table at all).

## Year view, scoped to a single property (slice 6)

The Year tab is a property picker plus a full month-by-month grid for
whichever property is selected (defaults to the first one) — 12 real
calendars, guest-name bars spanning each stay's actual check-in through
checkout, colored by source the same way Month/Week are
(`getPlatformBadge`) — modeled on the per-listing calendar view OTAs
like Airbnb show a host.

There's deliberately no "all properties at once" mode: an earlier
version summarized every property as small colored dots on a mini
calendar, but with more than one property that's unreadable — you
can't tell which dot belongs to which listing, so it didn't actually
answer "what does this year look like." Picking one property and
showing its real bookings does.

- Nightly pricing isn't part of this: an OTA's own calendar-sync feed
  never includes price (it's stripped before export), so there's no data
  source this could pull from — showing it would mean adding manual
  price entry, a step toward the financials/income feature Manager is
  meant not to see, and out of scope here.
- A stay that crosses a week row is drawn as one bar per row, clipped to
  that row's 7 days, with rounded corners only on the edge that's the
  real check-in or checkout — so it reads as one continuous booking
  across the row break rather than two separate ones.
- Same check-in 2pm / checkout 10am overlap as Month/Week: a bar starts
  partway into its check-in day's cell and ends partway into its
  checkout day's cell (`CHECKIN_FRAC`/`CHECKOUT_FRAC` from
  `calendar-utils.ts`), rather than occupying whole day cells — so
  back-to-back bookings on the same day still read as a same-day
  turnover, not an overlap or a gap.
- Clicking a guest bar opens that booking for editing, same modal as
  Month/Week. Clicking a bare day jumps to Month view on that date.

## Cleaning history (slice 7)

`/history` — a read-only log of every booking marked `complete`, newest
first: property, guest(s), check-in, nights, source, rating, and any
dispute. A Cleaner sees only their own completed jobs; an Owner or
Manager sees every completed job across every property, with a
"Cleaner" column added so it doubles as a full team activity log. No
new table or RLS policy — it's a query over `bookings` that already
existed, scoped the same way the calendar itself already scopes a
cleaner's view (`assigned_cleaner_id = auth.uid()`), just presented as
a history instead of a live calendar. The summary line's average
rating is the same foundation a later "basic reporting" pass would
build on.

## Backlog

Waiting on something outside this repo before there's anything to build:

- **Background checks (Checkr)** and **ID verification (Stripe Identity
  or Persona)** — the last two pieces of the cleaner marketplace. Both
  need you to sign up with the provider and get real API credentials
  first; not something that can be stubbed or faked, since they involve
  legally regulated handling of background-check data (FCRA compliance
  in the US) and government ID documents. Once you have an account and
  keys for either one, say so and this gets wired up properly.

## Setup

### 1. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com) (the free
tier is enough to start).

### 2. Run the schema migrations

In the Supabase dashboard, open **SQL Editor** and run, in order:
`0001_init.sql`, `0002_photos_and_cleaner_scope.sql`,
`0003_ical_sync_and_access_instructions.sql`, `0004_booking_platform_label.sql`,
`0005_booking_guests.sql`, `0006_cleaner_profiles_and_ratings.sql`,
`0007_open_job_board.sql`, `0008_dispute_resolution.sql`,
`0009_owner_manager_roles.sql`, then `0010_ical_export.sql` (all under
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

### 4. Bootstrap your first owner

Every new sign-up defaults to the `cleaner` role (least privilege). To
make yourself the owner, sign in once through the app, then in the SQL
Editor run:

```sql
update public.profiles set role = 'owner' where id =
  (select id from auth.users where email = 'you@example.com');
```

From there, promote anyone else to `owner`, `manager`, or back to
`cleaner` from the Team roles section on `/cleaners`.

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
    profile/              self-service name/bio/phone/service-area editor
    cleaners/              staff-only cleaner directory + Owner-only Team roles UI
    history/              read-only completed-jobs log (own jobs, or everyone's if staff)
    api/cron/sync-ical/   optional Vercel Cron target (service-role sync)
    api/ical/[token]/     public per-property .ics export feed
  components/
    CalendarApp.tsx       topbar, view state, realtime subscription
    Timeline.tsx           Month/Week property-row rendering
    PropertyYearView.tsx   Year full-grid view, scoped to one property
    BookingModal.tsx       new/edit booking form + role-gated fields
    PropertiesAdmin.tsx    per-property iCal feeds + access instructions UI
    ProfileForm.tsx        self-service profile editor
    TeamRoles.tsx           Owner-only role management table
  lib/
    supabase/              browser/server/service-role client factories
    calendar-utils.ts      date math ported from the prototype
    ical.ts                minimal VEVENT (iCal) parser
    ical-sync.ts           shared fetch + upsert logic, used by button & cron
    ical-export.ts         builds the outbound .ics feed for api/ical/[token]
    platform-badge.ts      Airbnb/Vrbo/Booking.com/other badge color + letter
    types.ts               shared domain types
  proxy.ts                 auth guard (Next.js 16 renamed middleware -> proxy)
supabase/
  migrations/
    0001_init.sql                             schema + RLS policies + RPCs
    0002_photos_and_cleaner_scope.sql          storage bucket + cleaner-scoped RLS
    0003_ical_sync_and_access_instructions.sql  ical_feeds table + access_instructions
    0004_booking_platform_label.sql             source badge data (Airbnb/Vrbo/etc.)
    0005_booking_guests.sql                     guest name(s) field
    0006_cleaner_profiles_and_ratings.sql        profile fields + booking ratings
    0007_open_job_board.sql                      is_open_job + claim/release RPCs
    0008_dispute_resolution.sql                  dispute_messages + status triggers
    0009_owner_manager_roles.sql                 owner/manager/cleaner roles + RLS split
    0010_ical_export.sql                         per-property export tokens + regenerate RPC
  seed.sql                                     optional demo properties
```
