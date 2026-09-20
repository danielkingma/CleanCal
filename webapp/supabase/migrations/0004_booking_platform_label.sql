-- Records which platform a synced booking came from (Airbnb, Vrbo,
-- Booking.com, or a client's own labeled feed), so the calendar can show
-- a small source badge/stripe on the booking bar.
--
-- This is a denormalized snapshot of ical_feeds.source_label at sync
-- time, not a live foreign key -- deliberately, since ical_feeds is
-- admin-only (`ical_feeds_admin_all`), and a cleaner needs to be able to
-- read this value on their own assigned bookings without needing access
-- to the feeds table itself.
alter table public.bookings
  add column platform_label text;
