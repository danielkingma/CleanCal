# Same-day conflict spotter

A rules-based checker on the Dashboard (Owner/Manager). No AI call, no stored results: it is recalculated on every Dashboard load.

- Logic: `src/lib/conflicts.ts` (pure, tested in `tests/conflicts.test.mjs`).
- Settings: per-property `checkout_time`, `checkin_time`, `timezone`, `clean_minutes` (migration `0053_turnover_times.sql`), edited under Properties → Turnover times.
- Window: today and the next 3 days.
- For each unfinished booking whose next booking at the same property checks in on its check-out day: finish = start + clean length, where start is the cleaner's real start time if the clean is in progress, otherwise now (today) or check-out time. Clean length is the average of recorded cleans once there are 3, else the property default.
- Output: **Conflict** (finish after check-in; overlapping bookings; check-in not after check-out; unassigned today), **Tight** (under 60 minutes spare; unassigned on later days).
- Not built: email/text alerts, per-cleaner travel time, per-booking check-in times from the platform.
