// Minimal RFC 5545 VEVENT parser -- just enough to read the calendar
// export feeds Airbnb, Vrbo, Booking.com, and pretty much every direct
// booking site produce: a flat list of VEVENTs with UID/DTSTART/DTEND,
// no recurrence rules or timezone conversion needed since these feeds
// only ever contain single, already-resolved reservation blocks.

export interface IcsEvent {
  uid: string;
  startDate: string; // ISO yyyy-mm-dd (check-in)
  endDate: string; // ISO yyyy-mm-dd (checkout, exclusive)
  summary: string;
}

function unfoldLines(raw: string): string[] {
  const rawLines = raw.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseDateValue(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function parseIcs(raw: string): IcsEvent[] {
  const lines = unfoldLines(raw);
  const events: IcsEvent[] = [];
  let current: Partial<IcsEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.uid && current.startDate && current.endDate) {
        events.push({
          uid: current.uid,
          startDate: current.startDate,
          endDate: current.endDate,
          summary: current.summary ?? "",
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const sepIdx = line.indexOf(":");
    if (sepIdx === -1) continue;
    const key = line.slice(0, sepIdx).split(";")[0].toUpperCase();
    const value = line.slice(sepIdx + 1).trim();

    if (key === "UID") current.uid = value;
    else if (key === "SUMMARY") current.summary = value;
    else if (key === "DTSTART") {
      const d = parseDateValue(value);
      if (d) current.startDate = d;
    } else if (key === "DTEND") {
      const d = parseDateValue(value);
      if (d) current.endDate = d;
    }
  }

  return events;
}
