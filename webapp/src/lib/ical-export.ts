// The inverse of ical.ts: builds a minimal RFC 5545 feed of a property's
// bookings, for pasting into an OTA's "connect to another website"
// import field. Deliberately bare -- UID, dates, and a generic SUMMARY
// only -- since this is headed to a competitor's platform, not just
// another CleanCal user.

import { addDays, fromISO, isoDate } from "./calendar-utils";

interface ExportableBooking {
  id: string;
  checkin_date: string;
  nights: number;
}

function icsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildIcsFeed(propertyName: string, bookings: ExportableBooking[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CleanCal//Export//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${propertyName} (CleanCal)`,
  ];

  for (const b of bookings) {
    const checkout = isoDate(addDays(fromISO(b.checkin_date), b.nights));
    lines.push(
      "BEGIN:VEVENT",
      `UID:cleancal-${b.id}@cleancal`,
      `DTSTAMP:${stamp()}`,
      `DTSTART;VALUE=DATE:${icsDate(b.checkin_date)}`,
      `DTEND;VALUE=DATE:${icsDate(checkout)}`,
      "SUMMARY:Reserved",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
