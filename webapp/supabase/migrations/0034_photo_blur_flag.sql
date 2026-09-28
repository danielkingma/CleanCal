-- Flags a photo as blurry so the app can warn a cleaner before they mark a
-- job complete. The flag is computed client-side (a cheap Laplacian-variance
-- heuristic run in the browser at upload time, see BookingModal.tsx) -- it's
-- a best-effort nudge, not a hard guarantee, and staff can always override.
alter table public.photos
  add column if not exists is_blurry boolean not null default false;
