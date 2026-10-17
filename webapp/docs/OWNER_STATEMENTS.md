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
    basis (gross / net of cleaning), and cleaning charged to the owner
    (blank = the cleaner payout rate, plus linen when picked up).
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

## Platform listings (0045)

`property_platform_listings` holds any number of listings per property,
on any platform: the platform's display name (the same names the
calendar's platform badges use, or a host's own label) and what that
platform's payout export calls the property (a title or an ID). It
replaced the fixed `airbnb_listing_name` / `booking_com_property_id`
fields, whose values were copied across; those columns are no longer
used and will be dropped in a later migration.

Matching a payout row without a confirmation code tries, in order: the
row's listing ID then title against listings on the row's own platform,
then against listings on any platform, then the property's own name. A
listing can only belong to one property (unique per org, platform and
normalised identifier).

Clients & fees shows which platforms each property has a calendar feed
from but no listing yet, and pre-selects that platform. Placing a payout
on the Payouts page with "Remember this listing" adds the listing.

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
