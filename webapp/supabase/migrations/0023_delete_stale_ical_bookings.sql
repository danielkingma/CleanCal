-- A booking that disappears from its own source calendar (almost always
-- a cancellation) used to be flagged with ical_missing_since and left on
-- the calendar -- a dashed outline plus a "review and delete" banner --
-- for an Owner/Manager to confirm before removing it. That flagging step
-- is gone: syncOneFeed (ical-sync.ts) now deletes a booking outright the
-- moment it drops out of its feed, rather than leaving it to clutter the
-- calendar pending manual review.
--
-- One-time cleanup: remove every booking already sitting in that flagged
-- state under the old behavior, then drop the now-unused column.
delete from public.bookings where ical_missing_since is not null;

alter table public.bookings drop column ical_missing_since;
