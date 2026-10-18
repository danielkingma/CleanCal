import test from "node:test";
import assert from "node:assert/strict";
import { buildStatement, monthRange } from "../src/lib/statements.ts";

const prop = {
  id: "p1", name: "Guest house", payout_rate_cents: 8000, linen_box_count: 1, linen_fee_cents: 2000,
  mgmt_fee_percent: 15, fee_basis: "net_of_cleaning", owner_cleaning_charge_cents: null,
};

test("monthRange", () => {
  assert.deepEqual(monthRange("2026-02"), { start: "2026-02-01", end: "2026-02-28" });
  assert.equal(monthRange("2026-13"), null);
});

test("statement maths", () => {
  const s = buildStatement({
    clientName: "A", organizationName: "Org", start: "2026-10-01", end: "2026-10-31", generatedAt: "x",
    properties: [prop],
    lines: [
      { property_id: "p1", line_type: "reservation", guest_name: "G", checkin_date: "2026-10-02", nights: 2, payout_date: "2026-10-05", amount_cents: 50000, platform: "airbnb", confirmation_code: "HM1" },
      { property_id: "p1", line_type: "reservation", guest_name: "Old", checkin_date: "2026-09-02", nights: 2, payout_date: "2026-09-05", amount_cents: 99999, platform: "airbnb", confirmation_code: "" },
    ],
    bookings: [
      { property_id: "p1", checkin_date: "2026-10-02", nights: 2, guests: "G", linen_pickup: true },
      { property_id: "p1", checkin_date: "2026-10-30", nights: 3, guests: "Next month", linen_pickup: false },
    ],
    expenses: [{ property_id: "p1", expense_date: "2026-10-10", description: "Lightbulbs", amount_cents: 1500 }],
  });
  assert.equal(s.payouts_cents, 50000);
  assert.equal(s.cleaning_cents, 10000);
  assert.equal(s.fee_cents, 6000); // 15% of 40000
  assert.equal(s.expenses_cents, 1500);
  assert.equal(s.net_cents, 50000 - 10000 - 6000 - 1500);
});
