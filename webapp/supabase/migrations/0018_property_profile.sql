-- A property's "profile" -- how many bedrooms/bathrooms it has, and
-- whether it has an outdoor area -- so the cleaning checklist (built in
-- src/lib/calendar-utils.ts) can scale to match: one Bedroom/Bathroom
-- section per actual room instead of a single generic one, and no
-- Outdoor Areas section at all for a property that doesn't have one.

alter table public.properties
  add column bedroom_count integer not null default 1 check (bedroom_count >= 1),
  add column bathroom_count integer not null default 1 check (bathroom_count >= 1),
  add column has_outdoor_area boolean not null default false;
