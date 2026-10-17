# Owner statements add-on

Monthly statements for the landlords whose properties an organisation
manages: platform payout, minus cleaning and management fee, minus
expenses. Built in phases; this file tracks what exists.

"Owner" already means the CleanCal account owner (`profiles.role`), so
landlords are **property owners** in the database and **Clients** in the
UI.

## Phase 1 — foundation (this change)

- **Migration `0044_owner_statements_foundation.sql`**
  - `organizations.statements_enabled` — the add-on switch (default off).
  - `property_owners` — clients.
  - `property_financials` — per property: client, management fee %, fee
    basis (gross / net of cleaning), cleaning charged to the owner (blank
    = the cleaner payout rate, plus linen when picked up), and the Airbnb
    listing name / Booking.com property ID used to match imports.
  - `bookings.confirmation_code` — the platform reservation code.
  - `payout_imports` + `payout_lines` — every imported money row. A line
    counts toward a statement once it has a property; the booking link
    adds guest and nights.
  - All money tables are **staff-only RLS**. Cleaners can read their
    org's properties and bookings, which is why fees and payouts are not
    columns on those tables.
- **iCal sync** reads Airbnb's reservation code from each event's
  DESCRIPTION, so Airbnb bookings carry their `HM…` code automatically.
- **`/payouts`** — upload an Airbnb transaction-history CSV or a
  Booking.com export. Rows match by confirmation code, then by listing +
  check-in date, then by listing alone. Matching fills in the booking's
  guest name (never overwriting one) and code. Unmatched rows wait in a
  review list; choosing a property can remember the listing name so the
  next import matches automatically. Re-importing a file adds nothing
  twice; a whole import can be undone.
- **`/clients`** — manage clients and each property's fee settings.
- Parsing and matching live in `src/lib/payout-import.ts` (no framework
  imports). Tests: `npm test`.

## Turning it on

The superadmin account always sees it. For another organisation:

```sql
update public.organizations set statements_enabled = true where id = '<org id>';
```

## Next phases

2. Expenses (`owner_expenses`, plus a cost on maintenance work orders),
   the statement calculation, monthly and financial-year statements with
   frozen line snapshots, and a printable statement page.
3. Private owner links (token pattern from `ical_export_tokens`), email
   delivery, and Stripe billing for the add-on.

## Known limits

- Export column names vary by platform and change over time. Columns are
  found by header aliases (`ALIASES` in `payout-import.ts`); an
  unreadable file's error lists the headers it found, so adding an alias
  is the fix.
- Airbnb exports use month/day/year dates. Ambiguous files are read in
  the platform's usual order with a warning, and can be re-imported with
  the order chosen explicitly.
- Uploads are limited to about 900 KB (server action body limit). Export
  a month at a time.
