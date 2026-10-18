-- Owner statements: each client's statement currency (ISO 4217 code).
-- Payout lines in any other currency are left off that client's
-- statement and flagged, rather than silently mixed in.
alter table public.property_owners
  add column if not exists currency text not null default 'AUD'
  check (currency ~ '^[A-Z]{3}$');
