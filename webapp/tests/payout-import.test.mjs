// Run with: npm test
// Plain Node test runner; imports the TypeScript source directly
// (Node's --experimental-strip-types), so there's nothing to build first.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMatchContext,
  matchPayoutRow,
  parseAmountCents,
  parseCsv,
  parseDate,
  parsePayoutCsv,
  PayoutImportError,
  resolveProperty,
} from "../src/lib/payout-import.ts";

const AIRBNB_CSV = [
  "Date,Type,Confirmation code,Booking date,Start date,End date,Nights,Guest,Listing,Details,Reference code,Currency,Amount,Paid out,Service fee,Fast pay fee,Cleaning fee,Gross earnings,Occupancy taxes,Earnings year",
  "09/03/2026,Payout,,,,,,,,Transfer to Bank ****1234,REF1,AUD,,1640.00,,,,,,2026",
  '09/03/2026,Reservation,HMABC12345,08/20/2026,09/02/2026,09/05/2026,3,Sample Guest A,"Stylish Braddon Loft, near Lonsdale St",,,AUD,1000.00,,"30.00",,120.00,1030.00,,2026',
  "09/13/2026,Reservation,HMABC12346,08/25/2026,09/12/2026,09/14/2026,2,Sample Guest B,Kingston Foreshore 2BR,,,AUD,640.00,,19.20,,140.00,659.20,,2026",
  "09/20/2026,Resolution Adjustment,HMABC12346,,,,,Sample Guest B,Kingston Foreshore 2BR,Damage claim,,AUD,85.50,,,,,,,2026",
  "09/21/2026,Cancellation Fee,HMZZZ99999,,09/30/2026,10/02/2026,2,Sample Guest C,Unknown Listing,,,AUD,(25.00),,,,,,,2026",
].join("\n");

test("parseCsv handles quotes, embedded commas, CRLF and BOM", () => {
  const rows = parseCsv('﻿a,b,c\r\n1,"x, y",3\r\n"he said ""hi""",,\r\n');
  assert.deepEqual(rows, [
    ["a", "b", "c"],
    ["1", "x, y", "3"],
    ['he said "hi"', "", ""],
  ]);
});

test("parseCsv detects semicolon delimiters", () => {
  assert.deepEqual(parseCsv("a;b\n1;2"), [
    ["a", "b"],
    ["1", "2"],
  ]);
});

test("parseAmountCents handles symbols, thousands, negatives and decimal commas", () => {
  assert.equal(parseAmountCents("$1,234.56"), 123456);
  assert.equal(parseAmountCents("(12.00)"), -1200);
  assert.equal(parseAmountCents("-12"), -1200);
  assert.equal(parseAmountCents("AUD 1.234,56"), 123456);
  assert.equal(parseAmountCents("12,5"), 1250);
  assert.equal(parseAmountCents(""), null);
  assert.equal(parseAmountCents("n/a"), null);
});

test("parseDate reads ISO, both numeric orders and month names", () => {
  assert.equal(parseDate("2026-09-03", "dmy"), "2026-09-03");
  assert.equal(parseDate("03/09/2026", "dmy"), "2026-09-03");
  assert.equal(parseDate("09/03/2026", "mdy"), "2026-09-03");
  assert.equal(parseDate("3 Sep 2026", "mdy"), "2026-09-03");
  assert.equal(parseDate("September 3, 2026", "dmy"), "2026-09-03");
  assert.equal(parseDate("31/02/2026", "dmy"), null);
});

test("Airbnb export: detects platform, skips bank transfers, classifies lines", () => {
  const r = parsePayoutCsv(AIRBNB_CSV);
  assert.equal(r.platform, "airbnb");
  assert.equal(r.rows.length, 4);
  assert.equal(r.skipped.length, 1);
  assert.match(r.skipped[0].reason, /Bank transfer/);

  const [first, second, adj, cancel] = r.rows;
  assert.equal(first.confirmationCode, "HMABC12345");
  assert.equal(first.amountCents, 100000);
  assert.equal(first.checkinDate, "2026-09-02");
  assert.equal(first.payoutDate, "2026-09-03");
  assert.equal(first.nights, 3);
  assert.equal(first.listingText, "Stylish Braddon Loft, near Lonsdale St");
  assert.equal(first.guestName, "Sample Guest A");
  assert.equal(second.payoutDate, "2026-09-13");
  assert.equal(adj.lineType, "adjustment");
  assert.equal(adj.amountCents, 8550);
  assert.equal(cancel.lineType, "cancellation_fee");
  assert.equal(cancel.amountCents, -2500);
  // 09/13 and 09/20 prove month-first, so no "assumed" warning.
  assert.equal(r.warnings.length, 0);
});

test("dedupe keys are stable across re-imports and unique within a file", () => {
  const a = parsePayoutCsv(AIRBNB_CSV).rows.map((x) => x.dedupeKey);
  const b = parsePayoutCsv(AIRBNB_CSV).rows.map((x) => x.dedupeKey);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length);

  const twice = parsePayoutCsv(
    ["Date,Type,Confirmation code,Start date,Listing,Amount", "09/20/2026,Adjustment,HM1,,L,5.00", "09/20/2026,Adjustment,HM1,,L,5.00"].join("\n"),
  );
  assert.equal(twice.rows.length, 2);
  assert.notEqual(twice.rows[0].dedupeKey, twice.rows[1].dedupeKey);
});

test("Booking.com style export: price minus commission, cancellations, day-first dates", () => {
  const csv = [
    "Book number,Booked on,Guest name(s),Check-in,Check-out,Status,Price,Commission amount,Hotel ID,Property name",
    "4012345678,01/09/2026,Sample Guest D,14/09/2026,18/09/2026,ok,AUD 1600.00,AUD 240.00,BK10001,Kingston Foreshore 2BR",
    "4012345679,02/09/2026,Sample Guest E,20/09/2026,22/09/2026,cancelled_by_guest,AUD 0.00,AUD 0.00,BK10001,Kingston Foreshore 2BR",
  ].join("\n");
  const r = parsePayoutCsv(csv);
  assert.equal(r.platform, "booking_com");
  assert.equal(r.rows.length, 1);
  const row = r.rows[0];
  assert.equal(row.amountCents, 136000);
  assert.equal(row.checkinDate, "2026-09-14");
  assert.equal(row.nights, 4);
  assert.equal(row.payoutDate, null);
  assert.equal(row.listingId, "BK10001");
  assert.equal(row.confirmationCode, "4012345678");
  assert.ok(r.warnings.some((w) => /payout date/.test(w)));
  assert.equal(r.skipped[0].reason, "Zero amount");
});

test("ambiguous numeric dates produce a warning naming the assumed order", () => {
  const r = parsePayoutCsv(["Date,Type,Confirmation code,Start date,Listing,Amount", "03/04/2026,Reservation,HM1,03/02/2026,L,10"].join("\n"));
  assert.ok(r.warnings.some((w) => /month\/day\/year/.test(w)));
  assert.equal(r.rows[0].payoutDate, "2026-03-04");
  const forced = parsePayoutCsv(["Date,Type,Confirmation code,Start date,Listing,Amount", "03/04/2026,Reservation,HM1,03/02/2026,L,10"].join("\n"), { dateOrder: "dmy" });
  assert.equal(forced.rows[0].payoutDate, "2026-04-03");
  assert.equal(forced.warnings.length, 0);
});

test("unreadable file names the columns it found", () => {
  assert.throws(
    () => parsePayoutCsv("Foo,Bar\n1,2"),
    (e) => e instanceof PayoutImportError && /Columns in this file: Foo, Bar/.test(e.message),
  );
  assert.throws(() => parsePayoutCsv("Amount,Confirmation code\n"), PayoutImportError);
});

test("matching: code first, then listing + check-in, then property only", () => {
  const properties = [
    { id: "p-loft", name: "Braddon Loft", listings: [{ platform: "Airbnb", identifier: "Stylish Braddon Loft, near Lonsdale St" }] },
    { id: "p-kingston", name: "Kingston Foreshore 2BR", listings: [{ platform: "Booking.com", identifier: "BK10001" }] },
  ];
  const bookings = [
    { id: "b1", property_id: "p-loft", checkin_date: "2026-09-02", confirmation_code: "HMABC12345" },
    { id: "b2", property_id: "p-kingston", checkin_date: "2026-09-12", confirmation_code: null },
    { id: "b3", property_id: "p-kingston", checkin_date: "2026-09-14", confirmation_code: null },
  ];
  const ctx = buildMatchContext(bookings, properties);
  const rows = parsePayoutCsv(AIRBNB_CSV).rows;

  assert.deepEqual(matchPayoutRow(rows[0], ctx), { bookingId: "b1", propertyId: "p-loft", method: "code" });
  // No code on the booking yet: matched on the property's own name + check-in.
  assert.deepEqual(matchPayoutRow(rows[1], ctx), { bookingId: "b2", propertyId: "p-kingston", method: "listing_and_date" });
  // Adjustment has no check-in date: property only.
  assert.deepEqual(matchPayoutRow(rows[2], ctx), { bookingId: null, propertyId: "p-kingston", method: "listing_only" });
  assert.deepEqual(matchPayoutRow(rows[3], ctx), { bookingId: null, propertyId: null, method: "none" });

  const bk = parsePayoutCsv(
    ["Book number,Check-in,Check-out,Price,Commission amount,Hotel ID", "4012345678,14/09/2026,18/09/2026,1600,240,BK10001"].join("\n"),
  ).rows[0];
  assert.deepEqual(matchPayoutRow(bk, ctx), { bookingId: "b3", propertyId: "p-kingston", method: "listing_and_date" });
});

test("two bookings on the same property and day are not guessed between", () => {
  const ctx = buildMatchContext(
    [
      { id: "x1", property_id: "p", checkin_date: "2026-09-02", confirmation_code: null },
      { id: "x2", property_id: "p", checkin_date: "2026-09-02", confirmation_code: null },
    ],
    [{ id: "p", name: "Loft", listings: [] }],
  );
  const row = parsePayoutCsv(["Date,Type,Confirmation code,Start date,Listing,Amount", "09/03/2026,Reservation,HMNEW,09/02/2026,Loft,10"].join("\n")).rows[0];
  assert.deepEqual(matchPayoutRow(row, ctx), { bookingId: null, propertyId: "p", method: "listing_only" });
});

test("listings on any platform, platform-specific first, explicit listing beats property name", () => {
  const ctx = buildMatchContext(
    [],
    [
      // Same title used on two platforms for two different properties.
      { id: "p-airbnb", name: "Unit A", listings: [{ platform: "Airbnb", identifier: "Garden Studio" }] },
      { id: "p-vrbo", name: "Unit B", listings: [{ platform: "Vrbo", identifier: "Garden Studio" }, { platform: "Stayz", identifier: "98765" }] },
      // A property whose CleanCal name collides with another's listing.
      { id: "p-named", name: "Harbour View", listings: [] },
      { id: "p-listed", name: "Unit C", listings: [{ platform: "Airbnb", identifier: "Harbour View" }] },
    ],
  );
  const row = (platform, listingText, listingId = "") => ({ platform, listingText, listingId });
  assert.equal(resolveProperty(row("airbnb", "garden studio!"), ctx), "p-airbnb");
  // An "other" export (e.g. a Vrbo or Stayz report) matches any platform's listing.
  assert.equal(resolveProperty(row("other", "", "98765"), ctx), "p-vrbo");
  assert.equal(resolveProperty(row("airbnb", "Harbour View"), ctx), "p-listed");
  assert.equal(resolveProperty(row("other", "Unit A"), ctx), "p-airbnb");
  assert.equal(resolveProperty(row("airbnb", "Nowhere"), ctx), null);
});
