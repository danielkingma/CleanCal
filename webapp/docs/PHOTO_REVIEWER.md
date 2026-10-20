# Checklist photo reviewer

A second pair of eyes on a cleaner's own turnover photos, run automatically
the moment they mark a job **Complete** -- while they may still be on-site
to fix anything it catches, rather than the host finding out from a bad
guest review days later.

The one place in CleanCal that calls an external AI model. Everywhere else
in `src/lib` is deliberately pure/rule-based (see `statements.ts`,
`conflicts.ts`); whether a bed *looks* made isn't something a rule can
check, only something that can be judged by actually looking at the photo.

- **Logic**: `src/lib/photo-review.ts` -- `reviewCleaningPhotos()` sends up
  to 8 of the booking's photos (signed URLs, fetched by the model directly
  -- nothing is downloaded or re-uploaded by the app) plus the property's
  bedroom/bathroom/outdoor-area counts to Claude, asking it to judge the
  basics a guest would notice (bed made, bins emptied, surfaces clear,
  nothing left behind) and return `{looksGood, note}`. Tested in
  `tests/photo-review.test.mjs`.
- **Trigger**: `updateBookingCleaner` (`src/app/calendar/actions.ts`), only
  on a genuine to-clean/in-progress -> complete transition, never on a
  resave of an already-complete job. Scheduled with Next's `after()` so the
  cleaner's own save returns immediately -- the vision call can take a few
  seconds.
- **On a flag**: writes `checklist.attention = {flagged: true, note}` via
  the existing `cleaner_update_booking` RPC -- the same field a cleaner can
  set themselves from the "Needs attention" checkbox in BookingModal, so no
  new UI was needed: the existing `!` badge (Timeline, AgendaCard) and the
  attention note field just light up. A cleaner's own attention flag is
  never overwritten by an automated one.
- **Notification**: the assigned cleaner gets a push notification (the
  model's own one-sentence note as the body) -- the host isn't separately
  notified, but sees the same flag/note the next time they open the
  booking or look at the calendar.
- **Fails open everywhere**: no `ANTHROPIC_API_KEY` configured, no photos
  on the booking, a network error, or a response that doesn't parse as the
  expected JSON all mean the review simply didn't run (`ran: false`) --
  never a false flag, and never anything that blocks a cleaner from
  completing their job. Same "optional unless its env var is set" pattern
  as push notifications (`VAPID_*`) and SMS (`TWILIO_*`).
- **Cost**: one Claude call per completed booking (model configurable via
  `ANTHROPIC_PHOTO_REVIEW_MODEL`, defaulting to the cheapest current vision
  model) -- capped at 8 photos per review regardless of how many a cleaner
  uploaded, to keep cost and prompt size predictable.

## Not built yet

- Per-checklist-item photo tagging. Photos are booking-wide today (see
  `public.photos`), not linked to a specific checklist item, so the review
  judges the whole job from whatever photos exist rather than confirming
  item-by-item ("this photo is the made bed", "this one is the emptied
  bin"). Good enough for a general pass/fail + note; a more precise
  per-room verdict would need a `checklist_key` column on `photos` and a
  way for the cleaner to tag each upload at the point they take it.
- Notifying the host/manager directly when something is flagged (only the
  cleaner is pushed today -- the host finds out passively, via the
  existing attention badge).
- Any retry/backoff on a failed API call -- a flaky response just means
  no review ran for that job, with no second attempt.
