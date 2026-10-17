import { test } from "node:test";
import assert from "node:assert/strict";
import { extractConfirmationCode, parseIcs } from "../src/lib/ical.ts";

test("reads the Airbnb confirmation code from a folded DESCRIPTION", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:20260902",
    "DTEND;VALUE=DATE:20260905",
    "SUMMARY:Reserved",
    "UID:1418fb94e984-abc@airbnb.com",
    "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/de",
    " tails/HMABC12345\\nPhone Number (Last 4 Digits): 1234",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:20260910",
    "DTEND;VALUE=DATE:20260912",
    "SUMMARY:Airbnb (Not available)",
    "UID:blocked-1@airbnb.com",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const events = parseIcs(ics);
  assert.equal(events.length, 2);
  assert.equal(events[0].confirmationCode, "HMABC12345");
  assert.equal(events[1].confirmationCode, null);
});

test("no code in descriptions from other platforms", () => {
  assert.equal(extractConfirmationCode("CHECKIN: 2026-09-02\\nCHECKOUT: 2026-09-05"), null);
  assert.equal(extractConfirmationCode(""), null);
});
