import test from "node:test";
import assert from "node:assert/strict";
import { spotConflicts } from "../src/lib/conflicts.ts";

const prop = { id: "p1", name: "Beach House", checkin_time: "15:00", checkout_time: "10:00", timezone: "UTC", clean_minutes: 120 };
const b = (o) => ({ id: "x", property_id: "p1", nights: 2, status: "to-clean", assigned_cleaner_id: "c1", ...o });
// 2026-10-20 08:00 UTC = 08:00 local in a UTC property
const now = new Date("2026-10-20T08:00:00Z");

test("comfortable same-day turnover is not flagged", () => {
  const r = spotConflicts({ properties: [prop], now, bookings: [b({ id: "a", checkin_date: "2026-10-18" }), b({ id: "n", checkin_date: "2026-10-20", nights: 3 })] });
  assert.equal(r.length, 0);
});

test("a long clean runs past the next check-in", () => {
  const p = { ...prop, clean_minutes: 360 }; // 10:00 + 6h = 16:00, check-in 15:00
  const r = spotConflicts({ properties: [p], now, bookings: [b({ id: "a", checkin_date: "2026-10-18" }), b({ id: "n", checkin_date: "2026-10-20", nights: 3 })] });
  assert.equal(r.length, 1);
  assert.equal(r[0].kind, "late");
  assert.match(r[0].message, /60 minutes after the next guest's earliest check-in/);
});

test("tight when under an hour of slack", () => {
  const p = { ...prop, clean_minutes: 270 }; // finishes 14:30
  const r = spotConflicts({ properties: [p], now, bookings: [b({ id: "a", checkin_date: "2026-10-18" }), b({ id: "n", checkin_date: "2026-10-20", nights: 3 })] });
  assert.equal(r[0].kind, "tight");
  assert.match(r[0].message, /30 minutes/);
});

test("clean starting late today is projected from now", () => {
  const late = new Date("2026-10-20T13:30:00Z"); // not started at 13:30, 2h clean -> 15:30
  const r = spotConflicts({ properties: [prop], now: late, bookings: [b({ id: "a", checkin_date: "2026-10-18" }), b({ id: "n", checkin_date: "2026-10-20", nights: 3 })] });
  assert.equal(r[0].kind, "late");
  assert.match(r[0].message, /30 minutes after/);
});

test("completed cleans and non-same-day gaps are ignored", () => {
  const r = spotConflicts({ properties: [prop], now, bookings: [
    b({ id: "a", checkin_date: "2026-10-18", status: "complete" }), b({ id: "n", checkin_date: "2026-10-20", nights: 1 }),
    b({ id: "c", checkin_date: "2026-10-22", nights: 1 }), b({ id: "d", checkin_date: "2026-10-25" }),
  ] });
  assert.equal(r.length, 0);
});

test("overlapping bookings are critical", () => {
  const r = spotConflicts({ properties: [prop], now, bookings: [b({ id: "a", checkin_date: "2026-10-18", nights: 3 }), b({ id: "n", checkin_date: "2026-10-20" })] });
  assert.equal(r[0].kind, "overlap");
  assert.equal(r[0].severity, "critical");
});

test("unassigned same-day turnover is flagged", () => {
  const r = spotConflicts({ properties: [prop], now, bookings: [b({ id: "a", checkin_date: "2026-10-18", assigned_cleaner_id: null }), b({ id: "n", checkin_date: "2026-10-20" })] });
  assert.ok(r.some((c) => c.kind === "unassigned" && c.severity === "critical"));
});

test("uses recorded clean lengths once there are three", () => {
  const hist = [1, 2, 3].map((i) => b({ id: `h${i}`, checkin_date: `2026-09-0${i}`, nights: 1, status: "complete", cleaning_started_at: "2026-09-01T10:00:00Z", cleaning_completed_at: "2026-09-01T14:30:00Z" }));
  const r = spotConflicts({ properties: [prop], now, bookings: [...hist, b({ id: "a", checkin_date: "2026-10-18" }), b({ id: "n", checkin_date: "2026-10-20" })] });
  assert.equal(r[0].kind, "tight"); // 270 min average -> finishes 14:30
});

test("timezone shifts 'now'", () => {
  const p = { ...prop, timezone: "Australia/Sydney" };
  // 2026-10-19 22:00 UTC is 09:00 on the 20th in Sydney (AEDT, UTC+11)
  const r = spotConflicts({ properties: [{ ...p, clean_minutes: 400 }], now: new Date("2026-10-19T22:00:00Z"), bookings: [b({ id: "a", checkin_date: "2026-10-18" }), b({ id: "n", checkin_date: "2026-10-20" })] });
  assert.equal(r[0].kind, "late");
});
