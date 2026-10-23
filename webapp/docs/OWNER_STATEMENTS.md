# Owner statements add-on

Monthly statements for the landlords whose properties an organisation
manages: platform payout, minus cleaning and management fee, minus
expenses. Built in phases; this file tracks what exists.

"Owner" already means the CleanCal account owner (`profiles.role`), so
landlords are **property owners** in the database and **Clients** in the
UI.

Now sold as (one slice of) the $19/month Pro add-on -- see
`src/lib/billing.ts` and `0057_pro_addon.sql`. `organizations.statements_enabled`
below stays the hand-toggled grant for a negotiated beta/deal; buying Pro
through real billing sets the separate `pro_addon_active` instead.
`getStatementsAccess()` (`src/lib/statements-access.ts`) grants access on
either one being true, and that file's comment explains why they're kept
as two columns rather than one.

## Phase 1 — foundation

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

## Phases 2 and 3 (migration 0047)

- **`owner_expenses`** — property, date, description, amount. Entered on
  `/statements` for the month being viewed.
- **`owner_statements`** — one saved statement per client and period,
  with a frozen `snapshot` (jsonb) so later edits never change what an
  owner was sent. Re-saving replaces the snapshot and keeps the link.
- **Calculation** (`src/lib/statements.ts`, pure and tested): payouts
  dated (payout date, else check-in) in the period; one cleaning charge
  per booking whose checkout falls in the period (the property's owner
  cleaning charge, or the cleaner payout rate, plus linen boxes x linen
  fee when linen was picked up; a fixed owner charge is not topped up
  with linen); management fee % of payouts (gross) or of payouts after
  cleaning; expenses; net = payouts - cleaning - fee - expenses.
- **Financial year** — the same statement over a financial/tax year with
  a month-by-month table. The year's dates depend on the country picked
  (`FY_REGIONS` in `statements.ts`: AU 1 Jul, NZ/IN 1 Apr, UK 6 Apr, ZA
  1 Mar, US/CA/IE/other calendar year); `fy2025` means the year that
  starts in 2025 in that country. The choice is remembered in a
  `stmt_region` cookie. Saved statements store their own dates, so they
  label themselves ("FY 2025-26" or "2025").
- **Currency (migration 0048)** — `property_owners.currency` (ISO code,
  default AUD) is the currency of that client's statements and expenses.
  A payout line in any other currency is left out of the totals and
  flagged on the statement (no conversion). Imports use the file's
  currency column when present, otherwise the "Currency" choice on the
  Payouts page. Cleaning charges, fees and expenses are assumed to be in
  the client's currency; there is no exchange-rate handling. The fee is worked
  out per month and summed, so the year equals its months. A statement
  is refused if any query hits PostgREST's 1000-row cap, rather than
  silently under-reporting; use months for very large clients. GST and
  tax are not calculated.
- **`/statements`** — pick client and month or financial year, see the live statement,
  add expenses, save. **`/statements/[id]`** — printable saved copy plus
  owner-link controls.
- **Owner links** — `/owner-statement/[token]` is public (listed in
  `proxy.ts`), read through the service role, shows only one frozen
  statement and only while `share_enabled`. Replacing the link issues a
  new token. "Email to client" is a `mailto:` link; nothing is sent by
  the server.

## Not built yet

- Server-sent email delivery of statements.
- Maintenance work-order costs feeding expenses (expenses are entered by
  hand; work orders are readable by cleaners, so a cost column there
  needs its own staff-only table).
- Stripe billing for the add-on.

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
