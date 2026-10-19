// Same-day conflict spotter. Pure rules (no AI call, nothing stored): for each
// booking that is not yet cleaned, find the next booking at the same property
// and compare when the clean is expected to finish with the next guest's
// earliest check-in. Run from the Dashboard.

export interface ConflictProperty {
  id: string;
  name: string;
  checkin_time?: string | null; // "15:00"
  checkout_time?: string | null; // "10:00"
  timezone?: string | null; // IANA, e.g. "Australia/Sydney"
  clean_minutes?: number | null; // default clean length when there's no history
}

export interface ConflictBooking {
  id: string;
  property_id: string;
  checkin_date: string; // YYYY-MM-DD
  nights: number;
  status: "to-clean" | "in-progress" | "complete";
  assigned_cleaner_id: string | null;
  cleaning_started_at?: string | null;
  cleaning_completed_at?: string | null;
}

export type ConflictSeverity = "critical" | "warning";
export type ConflictKind = "overlap" | "no-time" | "late" | "tight" | "unassigned";

export interface Conflict {
  id: string;
  severity: ConflictSeverity;
  kind: ConflictKind;
  propertyName: string;
  date: string; // the turnover day, YYYY-MM-DD
  message: string;
}

export const DEFAULT_TZ = "Australia/Sydney";
export const DEFAULT_CHECKIN = "15:00";
export const DEFAULT_CHECKOUT = "10:00";
export const DEFAULT_CLEAN_MINUTES = 120;
// A turnover with less spare time than this is flagged as tight.
export const TIGHT_MINUTES = 60;

const MIN_HISTORY = 3;

export function timeToMinutes(t: string | null | undefined, fallback: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? "") ?? /^(\d{1,2}):(\d{2})/.exec(fallback)!;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function formatClock(minutesOfDay: number): string {
  const m = ((minutesOfDay % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

function isoFromDayNumber(n: number): string {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}

// Local wall-clock time in `tz` as "minutes since 1970-01-01 00:00 local".
export function localMinutes(instant: Date, tz: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(instant);
  } catch {
    return localMinutes(instant, DEFAULT_TZ);
  }
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const day = Math.round(Date.UTC(get("year"), get("month") - 1, get("day")) / 86400000);
  return day * 1440 + get("hour") * 60 + get("minute");
}

// Typical clean length for a property: the average of its recent recorded
// cleans when there are enough, otherwise the property's own default.
export function expectedCleanMinutes(property: ConflictProperty, bookings: ConflictBooking[]): number {
  const samples: number[] = [];
  for (const b of bookings) {
    if (b.property_id !== property.id || !b.cleaning_started_at || !b.cleaning_completed_at) continue;
    const mins = (Date.parse(b.cleaning_completed_at) - Date.parse(b.cleaning_started_at)) / 60000;
    if (mins >= 20 && mins <= 480) samples.push(mins);
  }
  if (samples.length >= MIN_HISTORY) {
    return Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
  }
  return property.clean_minutes ?? DEFAULT_CLEAN_MINUTES;
}

function plural(n: number) {
  return `${n} minute${n === 1 ? "" : "s"}`;
}

export function spotConflicts(input: {
  properties: ConflictProperty[];
  bookings: ConflictBooking[];
  now: Date;
  horizonDays?: number;
}): Conflict[] {
  const horizon = input.horizonDays ?? 3;
  const out: Conflict[] = [];

  for (const property of input.properties) {
    const tz = property.timezone || DEFAULT_TZ;
    const nowLocal = localMinutes(input.now, tz);
    const today = Math.floor(nowLocal / 1440);
    const coMin = timeToMinutes(property.checkout_time, DEFAULT_CHECKOUT);
    const ciMin = timeToMinutes(property.checkin_time, DEFAULT_CHECKIN);
    const estimate = expectedCleanMinutes(property, input.bookings);

    const list = input.bookings
      .filter((b) => b.property_id === property.id)
      .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date) || a.id.localeCompare(b.id));

    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.status === "complete") continue;
      const outDay = dayNumber(a.checkin_date) + a.nights;
      if (outDay < today || outDay > today + horizon) continue;
      const next = list[i + 1];
      if (!next) continue;
      const nextIn = dayNumber(next.checkin_date);
      const date = isoFromDayNumber(outDay);
      const base = { propertyName: property.name, date };

      if (nextIn < outDay) {
        out.push({
          ...base,
          id: `${a.id}:overlap`,
          severity: "critical",
          kind: "overlap",
          message: `Bookings overlap: a guest checks in on ${next.checkin_date} before the previous guest leaves on ${date}.`,
        });
        continue;
      }
      if (nextIn !== outDay) continue; // not a same-day turnover

      if (ciMin <= coMin) {
        out.push({
          ...base,
          id: `${a.id}:no-time`,
          severity: "critical",
          kind: "no-time",
          message: `Check-in (${formatClock(ciMin)}) is not after check-out (${formatClock(coMin)}), so there's no time to clean.`,
        });
        continue;
      }

      const windowStart = outDay * 1440 + coMin;
      const deadline = outDay * 1440 + ciMin;
      let start = outDay === today ? Math.max(nowLocal, windowStart) : windowStart;
      let live = outDay === today;
      if (a.status === "in-progress" && a.cleaning_started_at) {
        start = localMinutes(new Date(a.cleaning_started_at), tz);
        live = true;
      }
      let finish = start + estimate;
      if (a.status === "in-progress" && live) finish = Math.max(finish, nowLocal);
      const slack = deadline - finish;
      const finishClock = formatClock(finish % 1440);
      const checkinClock = formatClock(ciMin);
      const verb = live ? "projected to finish" : "scheduled to finish";

      if (slack < 0) {
        out.push({
          ...base,
          id: `${a.id}:late`,
          severity: "critical",
          kind: "late",
          message: `This clean is ${verb} ${plural(-slack)} after the next guest's earliest check-in (${checkinClock}), at about ${finishClock}.`,
        });
      } else if (slack < TIGHT_MINUTES) {
        out.push({
          ...base,
          id: `${a.id}:tight`,
          severity: "warning",
          kind: "tight",
          message: `Tight turnover: the clean is ${verb} about ${finishClock}, only ${plural(slack)} before the next guest's earliest check-in (${checkinClock}).`,
        });
      }

      if (!a.assigned_cleaner_id) {
        out.push({
          ...base,
          id: `${a.id}:unassigned`,
          severity: outDay === today ? "critical" : "warning",
          kind: "unassigned",
          message: `Same-day turnover with no cleaner assigned (next guest checks in at ${checkinClock}).`,
        });
      }
    }
  }

  const rank = { critical: 0, warning: 1 } as const;
  return out.sort(
    (x, y) => rank[x.severity] - rank[y.severity] || x.date.localeCompare(y.date) || x.propertyName.localeCompare(y.propertyName),
  );
}
