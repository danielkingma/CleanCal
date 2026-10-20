# Turnover dispatcher

Automatic cleaner assignment for a brand-new booking, and automatic
reshuffling when an existing one's dates shift and its current cleaner can
no longer do it — instead of a human noticing too late, or a job sitting
unassigned until someone checks the calendar.

**Off by default, per organization.** An Owner or Manager turns it on from
My Profile (`organizations.dispatcher_enabled`, migration
`0054_turnover_dispatcher.sql`). Turning it on never touches
already-assigned bookings retroactively — it only acts on what changes
from that point on. Turning it off at any time leaves every existing
assignment exactly as it is; manual assignment and the open job board work
identically either way, on or off.

## How it picks a cleaner

v1 has exactly one ranking signal: **how many times a cleaner has
completed a clean at this exact property**, with the most recent clean as
a tiebreaker. A cleaner with zero history at a property is never
auto-assigned to it — that's a guess, not "the right cleaner", so it's
left to the open job board instead (see below). There is no proximity
signal: CleanCal has no address, suburb, or coordinates for a property or
a cleaner today (`service_area` on a cleaner's profile is free text, not
something distance math can use). Adding real proximity later needs new
Property/Profile fields and a geocoding step; see `src/lib/dispatcher.ts`
for where that ranking would plug in.

**Availability** (`cleaner_unavailable_dates`) is checked and genuinely
excludes a cleaner — unlike everywhere else in the app, where it's only
ever an advisory warning banner. The date checked is the job's checkout
date (when the clean actually happens), via `calendar-utils.ts`'s
`checkoutDate()`.

**No eligible cleaner found** (nobody with history at the property is both
active and available) → the job is posted to the existing open job board
(`is_open_job = true`) exactly like an admin manually opening it, and
every active cleaner gets the same "First to claim it gets it." push as
today.

## When it runs

Inside `syncOneFeed()` (`src/lib/ical-sync.ts`), right after a feed's
upsert — which means it runs from all three places that call
`syncOneFeed`: the per-feed "Sync now" button, "Sync all feeds", and the
`/api/cron/sync-ical` scheduled route. A booking is a candidate only if
it's brand new, or its check-in date or length of stay just changed (both
can move which day the clean happens) — a re-synced booking whose dates
didn't change is left alone.

- **Brand new booking** → ranked and assigned (or posted open) immediately.
- **Existing booking, dates shifted, current cleaner still available** →
  nothing happens. Minimal disruption: a cleaner doesn't lose a job they
  already planned around just because a guest moved their stay slightly.
- **Existing booking, dates shifted, current cleaner now unavailable for
  the new date** → re-ranked from scratch (excluding that cleaner), same
  assign-or-open-board outcome as a brand-new booking.
- **A booking's dates shift back to when the original cleaner IS
  available again** → also nothing happens if they're still the assigned
  cleaner (no "swap back" logic — reshuffling is one-directional, away
  from an unavailable cleaner, never speculative).

This applies to every booking, not just ones the dispatcher itself
assigned — a manually-assigned job whose cleaner becomes unavailable after
a date shift gets reshuffled the same way once the organization has opted
in. If that's not what you want, turn the switch off and reassign shifted
jobs by hand as before.

A cancelled booking (the VEVENT disappearing from the feed) was already
handled before this feature existed — see the "missing" tracking in
`ical-sync.ts` — and needed no changes: the booking is deleted and
whoever was assigned gets notified, same as always.

## Notifications

Same `notifyUsers()` push patterns and copy as the existing manual-assign
and open-job-board flows (`notifyAssignment` in `calendar/actions.ts`) —
"New job assigned to you" / "New open job posted" — with one added
sentence on a dispatcher assignment noting it was automatic. No one is
notified just because the dispatcher looked at a booking and decided to
leave it alone.

## Not built yet

- Proximity/location-based ranking (needs new schema + geocoding; see
  above).
- Enforcing availability anywhere outside the dispatcher itself — self-
  claiming an open job, or an admin manually assigning someone, still only
  shows a warning, never blocks it.
- Any UI showing *why* a given assignment happened (it's in the push
  notification's body text only, not on the booking itself).
- Scoping reshuffle-on-shift to dispatcher-made assignments only (see
  above — today it applies to every assignment once the org has opted
  in).
