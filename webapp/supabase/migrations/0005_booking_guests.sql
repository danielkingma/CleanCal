-- Guest name(s) shown on the booking, under Property. Plain manual field
-- -- Airbnb/Vrbo/Booking.com deliberately omit real guest names from
-- their calendar export feeds (just "Reserved"), so this is filled in by
-- an admin for OTA bookings. See src/lib/ical-sync.ts for the one case
-- it's prefilled automatically: a feed whose SUMMARY isn't one of those
-- generic placeholders, and only when the field is still empty.
alter table public.bookings
  add column guests text not null default '';
