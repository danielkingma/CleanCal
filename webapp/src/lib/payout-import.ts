// Payout export import: reads an Airbnb or Booking.com CSV export into
// normalised money rows, then matches each row to a CleanCal booking (or
// at least a property). Pure functions only -- no database or framework
// imports -- so it can be tested with plain Node and reused on the
// server action side unchanged.
//
// Platforms rename export columns from time to time, so columns are
// found by a list of header aliases rather than fixed names. When a file
// can't be read, the error names the headers it found, so the fix (a new
// alias here) is obvious.

export type Platform = "airbnb" | "booking_com" | "other";
export type LineType = "reservation" | "adjustment" | "cancellation_fee" | "other";
export type DateOrder = "auto" | "dmy" | "mdy";

export interface ParsedPayoutRow {
  rowNumber: number; // 1-based line in the file, header = 1
  platform: Platform;
  lineType: LineType;
  confirmationCode: string;
  guestName: string;
  listingText: string;
  listingId: string; // Booking.com property ID, when the export has one
  checkinDate: string | null; // yyyy-mm-dd
  nights: number | null;
  payoutDate: string | null; // yyyy-mm-dd
  amountCents: number;
  currency: string;
  dedupeKey: string;
}

export interface SkippedRow {
  rowNumber: number;
  reason: string;
}

export interface ParseResult {
  platform: Platform;
  headers: string[];
  rows: ParsedPayoutRow[];
  skipped: SkippedRow[];
  warnings: string[];
}

export interface ParseOptions {
  platform?: Platform | "auto";
  dateOrder?: DateOrder;
  defaultCurrency?: string;
}

export class PayoutImportError extends Error {}

// ---------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------

function detectDelimiter(firstLine: string): string {
  const counts = [",", ";", "\t"].map((d) => ({ d, n: firstLine.split(d).length - 1 }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

// RFC 4180-style: quoted fields may contain the delimiter, newlines and
// doubled quotes. Returns rows of raw cell strings.
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLineEnd = src.search(/\r\n|\n|\r/);
  const delimiter = detectDelimiter(firstLineEnd === -1 ? src : src.slice(0, firstLineEnd));

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Earlier aliases win when a file has more than one candidate column.
const ALIASES = {
  code: ["confirmationcode", "reservationcode", "booknumber", "bookingnumber", "reservationnumber", "reservationid", "bookingid", "bookingreference"],
  type: ["type", "transactiontype"],
  payoutDate: ["date", "payoutdate", "paymentdate", "paidon", "transactiondate"],
  checkin: ["startdate", "checkin", "checkindate", "arrival", "arrivaldate"],
  checkout: ["enddate", "checkout", "checkoutdate", "departure", "departuredate"],
  nights: ["nights", "numberofnights", "roomnights", "lengthofstay"],
  guest: ["guest", "guestname", "guestnames", "guestsname", "bookername", "bookedby"],
  listing: ["listing", "listingname", "propertyname", "property", "unit", "unitname", "accommodation"],
  listingId: ["propertyid", "hotelid", "listingid"],
  currency: ["currency"],
  amount: ["amount", "payoutamount", "finalamount", "netamount", "net", "totalpayout", "hostpayout"],
  gross: ["price", "totalprice", "total", "grossamount", "originalamount"],
  commission: ["commissionamount", "commission"],
  status: ["status", "reservationstatus"],
} as const;

type Field = keyof typeof ALIASES;

function findColumns(headers: string[]): Partial<Record<Field, number>> {
  const norm = headers.map(normaliseHeader);
  const cols: Partial<Record<Field, number>> = {};
  for (const field of Object.keys(ALIASES) as Field[]) {
    for (const alias of ALIASES[field]) {
      const idx = norm.indexOf(alias);
      if (idx !== -1) {
        cols[field] = idx;
        break;
      }
    }
  }
  return cols;
}

function detectPlatform(headers: string[]): Platform {
  const norm = new Set(headers.map(normaliseHeader));
  if (norm.has("confirmationcode") && norm.has("listing")) return "airbnb";
  if (norm.has("booknumber") || norm.has("bookingnumber") || norm.has("commissionamount") || norm.has("hotelid")) {
    return "booking_com";
  }
  return "other";
}

// ---------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function validDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

// Numeric day/month dates are ambiguous (03/04/2026), so the caller
// decides the order once per file -- see resolveDateOrder.
export function parseDate(raw: string, order: "dmy" | "mdy"): string | null {
  const v = raw.trim();
  if (!v) return null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
  if (m) return validDate(Number(m[1]), Number(m[2]), Number(m[3]));

  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/.exec(v);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = fullYear(Number(m[3]));
    return order === "dmy" ? validDate(y, b, a) : validDate(y, a, b);
  }

  // "2 Sep 2026", "02 September 2026"
  m = /^(\d{1,2})\s+([a-z]{3,})\.?,?\s+(\d{2,4})/i.exec(v);
  if (m) {
    const mon = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mon !== -1) return validDate(fullYear(Number(m[3])), mon + 1, Number(m[1]));
  }
  // "Sep 2, 2026", "September 2 2026"
  m = /^([a-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{2,4})/i.exec(v);
  if (m) {
    const mon = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (mon !== -1) return validDate(fullYear(Number(m[3])), mon + 1, Number(m[2]));
  }
  return null;
}

// Looks at every numeric dd/mm-style date in the file: a first part over
// 12 can only be a day, a second part over 12 can only be a day.
function resolveDateOrder(values: string[], requested: DateOrder, platform: Platform): { order: "dmy" | "mdy"; assumed: boolean } {
  if (requested !== "auto") return { order: requested, assumed: false };
  let dmy = false;
  let mdy = false;
  let anyNumeric = false;
  for (const v of values) {
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}/.exec(v.trim());
    if (!m) continue;
    anyNumeric = true;
    if (Number(m[1]) > 12) dmy = true;
    if (Number(m[2]) > 12) mdy = true;
  }
  if (dmy && !mdy) return { order: "dmy", assumed: false };
  if (mdy && !dmy) return { order: "mdy", assumed: false };
  // Airbnb's CSV uses US month-first dates; most other exports in
  // Australia are day-first.
  return { order: platform === "airbnb" ? "mdy" : "dmy", assumed: anyNumeric };
}

// "$1,234.56", "(12.00)", "-12", "AUD 1 234,56", "1.234,56" -> cents
export function parseAmountCents(raw: string): number | null {
  let v = raw.trim();
  if (!v) return null;
  let negative = false;
  if (/^\(.*\)$/.test(v)) {
    negative = true;
    v = v.slice(1, -1);
  }
  v = v.replace(/[^0-9.,-]/g, "");
  if (v.startsWith("-")) {
    negative = !negative;
    v = v.slice(1);
  }
  if (v.endsWith("-")) {
    negative = !negative;
    v = v.slice(0, -1);
  }
  if (!v || /-/.test(v)) return null;
  if (/^\d{1,3}(\.\d{3})*,\d{1,2}$/.test(v) || /^\d+,\d{1,2}$/.test(v)) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else {
    v = v.replace(/,/g, "");
  }
  if (!/^\d*\.?\d*$/.test(v) || v === ".") return null;
  const cents = Math.round(Number(v) * 100);
  if (!Number.isFinite(cents)) return null;
  return negative ? -cents : cents;
}

function daysBetweenIso(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function classifyAirbnbType(type: string): LineType | "skip_payout" {
  const t = type.trim().toLowerCase();
  if (!t) return "reservation";
  if (t === "payout") return "skip_payout";
  if (t === "reservation" || t === "home reservation" || t === "experience reservation") return "reservation";
  if (t.includes("cancellation")) return "cancellation_fee";
  if (t.includes("adjustment") || t.includes("resolution")) return "adjustment";
  return "other";
}

// ---------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------

export function parsePayoutCsv(text: string, options: ParseOptions = {}): ParseResult {
  const table = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (table.length < 2) throw new PayoutImportError("The file has no data rows.");

  const headers = table[0].map((h) => h.trim());
  const platform: Platform = !options.platform || options.platform === "auto" ? detectPlatform(headers) : options.platform;
  const cols = findColumns(headers);
  const warnings: string[] = [];

  const hasAmount = cols.amount !== undefined || (cols.gross !== undefined && cols.commission !== undefined);
  const canIdentify = cols.code !== undefined || cols.checkin !== undefined;
  if (!hasAmount || !canIdentify) {
    const missing = [
      !hasAmount ? "a payout amount" : null,
      !canIdentify ? "a confirmation code or check-in date" : null,
    ].filter(Boolean);
    throw new PayoutImportError(
      `Couldn't find ${missing.join(" or ")} column. Columns in this file: ${headers.join(", ") || "(none)"}.`,
    );
  }
  if (cols.payoutDate === undefined) {
    warnings.push("No payout date column, so these rows will be dated by check-out on statements.");
  }

  const cell = (row: string[], field: Field): string => {
    const idx = cols[field];
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  };

  const dateValues: string[] = [];
  for (const row of table.slice(1)) {
    for (const f of ["payoutDate", "checkin", "checkout"] as Field[]) dateValues.push(cell(row, f));
  }
  const { order, assumed } = resolveDateOrder(dateValues, options.dateOrder ?? "auto", platform);
  if (assumed) {
    warnings.push(
      order === "mdy"
        ? "Dates were read as month/day/year (Airbnb's usual format). Re-import with day/month/year if they look wrong."
        : "Dates were read as day/month/year. Re-import with month/day/year if they look wrong.",
    );
  }

  const rows: ParsedPayoutRow[] = [];
  const skipped: SkippedRow[] = [];
  const keyCounts = new Map<string, number>();
  const defaultCurrency = (options.defaultCurrency ?? "AUD").toUpperCase();

  table.slice(1).forEach((row, i) => {
    const rowNumber = i + 2;

    let lineType: LineType = "reservation";
    if (platform === "airbnb") {
      const kind = classifyAirbnbType(cell(row, "type"));
      if (kind === "skip_payout") {
        skipped.push({ rowNumber, reason: "Bank transfer summary (its reservations are imported separately)" });
        return;
      }
      lineType = kind;
    } else {
      const status = cell(row, "status").toLowerCase();
      if (status.includes("cancel") || status.includes("no show") || status.includes("no_show")) {
        lineType = "cancellation_fee";
      }
    }

    let amountCents = cols.amount !== undefined ? parseAmountCents(cell(row, "amount")) : null;
    if (amountCents === null && cols.gross !== undefined && cols.commission !== undefined) {
      const gross = parseAmountCents(cell(row, "gross"));
      const commission = parseAmountCents(cell(row, "commission"));
      if (gross !== null) amountCents = gross - Math.abs(commission ?? 0);
    }
    if (amountCents === null) {
      skipped.push({ rowNumber, reason: "No amount" });
      return;
    }
    if (amountCents === 0) {
      skipped.push({ rowNumber, reason: "Zero amount" });
      return;
    }

    const checkinDate = parseDate(cell(row, "checkin"), order);
    const checkoutDate = parseDate(cell(row, "checkout"), order);
    const payoutDate = parseDate(cell(row, "payoutDate"), order);
    const nightsRaw = Number.parseInt(cell(row, "nights"), 10);
    const nights = Number.isFinite(nightsRaw) && nightsRaw >= 0
      ? nightsRaw
      : checkinDate && checkoutDate && checkoutDate > checkinDate
        ? daysBetweenIso(checkinDate, checkoutDate)
        : null;

    const confirmationCode = cell(row, "code").toUpperCase();
    if (!confirmationCode && !checkinDate) {
      skipped.push({ rowNumber, reason: "No confirmation code or check-in date" });
      return;
    }

    const listingText = cell(row, "listing");
    const listingId = cell(row, "listingId");
    const currency = (cell(row, "currency") || defaultCurrency).toUpperCase().slice(0, 3);

    // Same file imported twice -> same keys -> nothing added the second
    // time. The counter keeps genuinely repeated identical lines within
    // one file (rare, but possible for adjustments) as separate rows.
    const base = [platform, confirmationCode, lineType, payoutDate ?? "", amountCents, checkinDate ?? "", listingId || listingText.toLowerCase()].join("|");
    const n = (keyCounts.get(base) ?? 0) + 1;
    keyCounts.set(base, n);

    rows.push({
      rowNumber,
      platform,
      lineType,
      confirmationCode,
      guestName: cell(row, "guest"),
      listingText,
      listingId,
      checkinDate,
      nights,
      payoutDate,
      amountCents,
      currency,
      dedupeKey: n === 1 ? base : `${base}#${n}`,
    });
  });

  return { platform, headers, rows, skipped, warnings };
}

// ---------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------

export interface MatchBooking {
  id: string;
  property_id: string;
  checkin_date: string;
  confirmation_code: string | null;
}

export interface MatchProperty {
  id: string;
  name: string;
  airbnb_listing_name: string;
  booking_com_property_id: string;
}

export type MatchMethod = "code" | "listing_and_date" | "listing_only" | "none";

export interface MatchResult {
  bookingId: string | null;
  propertyId: string | null;
  method: MatchMethod;
}

export interface MatchContext {
  byCode: Map<string, MatchBooking>;
  byPropertyDate: Map<string, MatchBooking[]>;
  byListingName: Map<string, string>;
  byBookingComId: Map<string, string>;
}

export function normaliseListing(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildMatchContext(bookings: MatchBooking[], properties: MatchProperty[]): MatchContext {
  const byCode = new Map<string, MatchBooking>();
  const byPropertyDate = new Map<string, MatchBooking[]>();
  for (const b of bookings) {
    if (b.confirmation_code) byCode.set(b.confirmation_code.toUpperCase(), b);
    const key = `${b.property_id}|${b.checkin_date}`;
    byPropertyDate.set(key, [...(byPropertyDate.get(key) ?? []), b]);
  }

  // An explicit listing name wins over a property's own name, so the
  // property names go in first and get overwritten.
  const byListingName = new Map<string, string>();
  for (const p of properties) {
    const n = normaliseListing(p.name);
    if (n) byListingName.set(n, p.id);
  }
  for (const p of properties) {
    const n = normaliseListing(p.airbnb_listing_name);
    if (n) byListingName.set(n, p.id);
  }
  const byBookingComId = new Map<string, string>();
  for (const p of properties) {
    const id = p.booking_com_property_id.trim();
    if (id) byBookingComId.set(id, p.id);
  }
  return { byCode, byPropertyDate, byListingName, byBookingComId };
}

export function resolveProperty(row: Pick<ParsedPayoutRow, "listingId" | "listingText">, ctx: MatchContext): string | null {
  if (row.listingId && ctx.byBookingComId.has(row.listingId)) return ctx.byBookingComId.get(row.listingId)!;
  const n = normaliseListing(row.listingText);
  return n ? (ctx.byListingName.get(n) ?? null) : null;
}

export function matchPayoutRow(row: ParsedPayoutRow, ctx: MatchContext): MatchResult {
  if (row.confirmationCode) {
    const b = ctx.byCode.get(row.confirmationCode);
    if (b) return { bookingId: b.id, propertyId: b.property_id, method: "code" };
  }
  const propertyId = resolveProperty(row, ctx);
  if (!propertyId) return { bookingId: null, propertyId: null, method: "none" };
  if (row.checkinDate) {
    const candidates = ctx.byPropertyDate.get(`${propertyId}|${row.checkinDate}`) ?? [];
    // Only an unambiguous single booking counts; two bookings on one
    // property starting the same day means someone has to choose.
    if (candidates.length === 1) return { bookingId: candidates[0].id, propertyId, method: "listing_and_date" };
  }
  return { bookingId: null, propertyId, method: "listing_only" };
}
