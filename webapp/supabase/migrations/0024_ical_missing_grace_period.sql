-- A booking whose UID drops out of a single feed fetch has repeatedly
-- turned out to be a false positive rather than a real cancellation: a
-- transient fetch/parsing hiccup, a feed that happened to omit a
-- reservation on one pull, or a relink briefly producing a fetch the sync
-- couldn't reconcile against what it already knew. Deleting on the very
-- first time a UID goes missing has cost real bookings more than once.
--
-- This adds a one-cycle grace period: the first time a booking is missing
-- from its feed, it's only marked (not deleted). It's deleted only if
-- it's *still* missing on a later sync -- a real cancellation stays gone
-- across syncs, while a one-off fetch anomaly self-heals on the next pull
-- and clears the mark. Internal bookkeeping only, not shown in the UI
-- (unlike the old, removed ical_missing_since banner/flag).
alter table public.bookings
  add column ical_missing_first_seen_at timestamptz;
