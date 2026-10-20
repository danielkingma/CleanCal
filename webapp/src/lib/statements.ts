// Owner statement calculation. Pure (no framework or database imports)
// so it can be tested and reused by the page, the saved snapshot and
// the owner link.
//
// A statement for one client and period:
//   payouts   = imported payout lines on the client's properties, dated
//               (payout date, else check-in) inside the period
//   cleaning  = one charge per booking whose checkout falls in the
//               period: the property's owner cleaning charge, or the
//               cleaner payout rate plus linen when linen was picked up
//   mgmt fee  = fee % of payouts (gross) or of payouts minus cleaning
//   expenses  = owner_expenses dated inside the period
//   net       = payouts - cleaning - fee - expenses

export interface StatementProperty {
  id: string;
  name: string;
  payout_rate_cents: number | null;
  linen_box_count: number;
  linen_fee_cents: number;
  mgmt_fee_percent: number;
  fee_basis: "gross" | "net_of_cleaning";
  owner_cleaning_charge_cents: number | null;
}

export interface StatementPayoutLine {
  property_id: string;
  line_type: string;
  guest_name: string;
  checkin_date: string | null;
  nights: number | null;
  payout_date: string | null;
  amount_cents: number;
  currency?: string;
  platform: string;
  confirmation_code: string;
}

export interface StatementBooking {
  property_id: string;
  checkin_date: string;
  nights: number;
  guests: string;
  linen_pickup: boolean;
}

export interface StatementExpense {
  property_id: string;
  expense_date: string;
  description: string;
  amount_cents: number;
}

export interface StatementPayoutRow {
  date: string | null;
  guest: string;
  detail: string;
  amount_cents: number;
}
export interface StatementCleaningRow {
  date: string;
  guest: string;
  amount_cents: number;
  linen: boolean;
}
export interface StatementExpenseRow {
  date: string;
  description: string;
  amount_cents: number;
}

export interface StatementPropertySection {
  property_id: string;
  property_name: string;
  mgmt_fee_percent: number;
  fee_basis: "gross" | "net_of_cleaning";
  payouts: StatementPayoutRow[];
  cleaning: StatementCleaningRow[];
  expenses: StatementExpenseRow[];
  payouts_cents: number;
  cleaning_cents: number;
  fee_cents: number;
  expenses_cents: number;
  net_cents: number;
}

export interface StatementMonthRow {
  month: string; // "2026-10"
  payouts_cents: number;
  cleaning_cents: number;
  fee_cents: number;
  expenses_cents: number;
  net_cents: number;
}

export interface StatementSnapshot {
  version: 1;
  client_name: string;
  organization_name: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  currency: string;
  properties: StatementPropertySection[];
  payouts_cents: number;
  cleaning_cents: number;
  fee_cents: number;
  expenses_cents: number;
  net_cents: number;
  // Month-by-month totals across all properties. Absent on statements
  // saved before financial-year statements existed.
  months?: StatementMonthRow[];
  // Payouts in a currency other than the statement's, left out of every
  // total above rather than mixed in without a conversion.
  excluded_payouts?: { currency: string; count: number; total_cents: number }[];
}

// Financial / tax years by country. A year is identified by the calendar
// year it STARTS in (fy2025 = Australia's 1 Jul 2025 - 30 Jun 2026).
export type FYRegion = "au" | "nz" | "uk" | "ie" | "us" | "ca" | "za" | "in" | "cal";

export const FY_REGIONS: Record<FYRegion, { name: string; startMonth: number; startDay: number; note: string }> = {
  au: { name: "Australia", startMonth: 7, startDay: 1, note: "1 Jul – 30 Jun" },
  nz: { name: "New Zealand", startMonth: 4, startDay: 1, note: "1 Apr – 31 Mar" },
  uk: { name: "United Kingdom (tax year)", startMonth: 4, startDay: 6, note: "6 Apr – 5 Apr" },
  ie: { name: "Ireland", startMonth: 1, startDay: 1, note: "1 Jan – 31 Dec" },
  us: { name: "United States", startMonth: 1, startDay: 1, note: "1 Jan – 31 Dec" },
  ca: { name: "Canada", startMonth: 1, startDay: 1, note: "1 Jan – 31 Dec" },
  za: { name: "South Africa", startMonth: 3, startDay: 1, note: "1 Mar – end Feb" },
  in: { name: "India", startMonth: 4, startDay: 1, note: "1 Apr – 31 Mar" },
  cal: { name: "Calendar year (other)", startMonth: 1, startDay: 1, note: "1 Jan – 31 Dec" },
};

export function isFYRegion(v: unknown): v is FYRegion {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(FY_REGIONS, v);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function fyRange(fy: number, region: FYRegion = "au"): { start: string; end: string } {
  const r = FY_REGIONS[region];
  const start = `${fy}-${pad(r.startMonth)}-${pad(r.startDay)}`;
  const nextStart = `${fy + 1}-${pad(r.startMonth)}-${pad(r.startDay)}`;
  return { start, end: addDaysISO(nextStart, -1) };
}

// The year (by its start) that contains `today`.
export function currentFY(today: string, region: FYRegion = "au"): number {
  const r = FY_REGIONS[region];
  const y = Number(today.slice(0, 4));
  const startThisYear = `${y}-${pad(r.startMonth)}-${pad(r.startDay)}`;
  return today >= startThisYear ? y : y - 1;
}

// "FY 2025–26", or just "2026" for a calendar-year period. Works from the
// dates alone, so a saved statement labels itself whatever country it was
// made for.
export function fyLabelFromDates(start: string, end: string): string {
  const sy = Number(start.slice(0, 4));
  const ey = Number(end.slice(0, 4));
  if (sy === ey) return `${sy}`;
  return `FY ${sy}\u2013${String(ey).slice(2)}`;
}
export function fyLabel(fy: number, region: FYRegion = "au"): string {
  const { start, end } = fyRange(fy, region);
  return fyLabelFromDates(start, end);
}

// "2026-10" -> a month; "fy2025" -> that region's financial year; else null.
export function periodRange(
  key: string,
  region: FYRegion = "au",
): { start: string; end: string; kind: "month" | "fy" } | null {
  const fy = /^fy(\d{4})$/.exec(key);
  if (fy) return { ...fyRange(Number(fy[1]), region), kind: "fy" };
  const m = monthRange(key);
  return m ? { ...m, kind: "month" } : null;
}

export function monthKeys(start: string, end: string): string[] {
  const out: string[] = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7));
  const last = end.slice(0, 7);
  for (;;) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(key);
    if (key >= last) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// "2026-10" -> first and last day of that month.
export function monthRange(month: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const start = `${m[1]}-${m[2]}-01`;
  const end = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function inRange(date: string | null, start: string, end: string): boolean {
  return Boolean(date) && (date as string) >= start && (date as string) <= end;
}

export function cleaningChargeCents(p: StatementProperty, linenPickup: boolean): number {
  if (p.owner_cleaning_charge_cents !== null) return p.owner_cleaning_charge_cents;
  const base = p.payout_rate_cents ?? 0;
  const linen = linenPickup ? p.linen_box_count * p.linen_fee_cents : 0;
  return base + linen;
}

export function buildStatement(input: {
  clientName: string;
  organizationName: string;
  currency?: string;
  start: string;
  end: string;
  generatedAt: string;
  properties: StatementProperty[];
  lines: StatementPayoutLine[];
  bookings: StatementBooking[];
  expenses: StatementExpense[];
}): StatementSnapshot {
  const { start, end } = input;
  const currency = (input.currency ?? "AUD").toUpperCase();
  const sameCurrency = (l: StatementPayoutLine) => (l.currency ?? currency).toUpperCase() === currency;
  const excluded = new Map<string, { count: number; total: number }>();
  for (const l of input.lines) {
    if (sameCurrency(l) || !inRange(l.payout_date ?? l.checkin_date, start, end)) continue;
    const c = (l.currency as string).toUpperCase();
    const e = excluded.get(c) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += l.amount_cents;
    excluded.set(c, e);
  }
  const monthFees = new Map<string, number>();
  const sections: StatementPropertySection[] = input.properties.map((p) => {
    const payouts = input.lines
      .filter((l) => sameCurrency(l) && l.property_id === p.id && inRange(l.payout_date ?? l.checkin_date, start, end))
      .sort((a, b) => (a.payout_date ?? a.checkin_date ?? "").localeCompare(b.payout_date ?? b.checkin_date ?? ""))
      .map<StatementPayoutRow>((l) => ({
        date: l.payout_date ?? l.checkin_date,
        guest: l.guest_name,
        detail: [l.platform === "booking_com" ? "Booking.com" : l.platform === "airbnb" ? "Airbnb" : "Other", l.line_type !== "reservation" ? l.line_type.replace("_", " ") : "", l.confirmation_code]
          .filter(Boolean)
          .join(" · "),
        amount_cents: l.amount_cents,
      }));

    const cleaning = input.bookings
      .filter((b) => b.property_id === p.id && inRange(addDaysISO(b.checkin_date, b.nights), start, end))
      .sort((a, b) => addDaysISO(a.checkin_date, a.nights).localeCompare(addDaysISO(b.checkin_date, b.nights)))
      .map<StatementCleaningRow>((b) => ({
        date: addDaysISO(b.checkin_date, b.nights),
        guest: b.guests,
        amount_cents: cleaningChargeCents(p, b.linen_pickup),
        linen: b.linen_pickup && p.owner_cleaning_charge_cents === null,
      }));

    const expenses = input.expenses
      .filter((e) => e.property_id === p.id && inRange(e.expense_date, start, end))
      .sort((a, b) => a.expense_date.localeCompare(b.expense_date))
      .map<StatementExpenseRow>((e) => ({ date: e.expense_date, description: e.description, amount_cents: e.amount_cents }));

    const payoutsCents = payouts.reduce((s, r) => s + r.amount_cents, 0);
    const cleaningCents = cleaning.reduce((s, r) => s + r.amount_cents, 0);
    const expensesCents = expenses.reduce((s, r) => s + r.amount_cents, 0);
    // The fee is worked out month by month and added up, so a financial
    // year's total always equals the sum of its months.
    const monthly = new Map<string, { payouts: number; cleaning: number; expenses: number }>();
    const bucket = (m: string) => {
      let b = monthly.get(m);
      if (!b) {
        b = { payouts: 0, cleaning: 0, expenses: 0 };
        monthly.set(m, b);
      }
      return b;
    };
    for (const r of payouts) bucket((r.date ?? start).slice(0, 7)).payouts += r.amount_cents;
    for (const r of cleaning) bucket(r.date.slice(0, 7)).cleaning += r.amount_cents;
    for (const r of expenses) bucket(r.date.slice(0, 7)).expenses += r.amount_cents;
    let feeCents = 0;
    for (const [m, b] of monthly) {
      const base = p.fee_basis === "gross" ? b.payouts : b.payouts - b.cleaning;
      const fee = Math.max(0, Math.round((base * p.mgmt_fee_percent) / 100));
      feeCents += fee;
      monthFees.set(m, (monthFees.get(m) ?? 0) + fee);
    }
    return {
      property_id: p.id,
      property_name: p.name,
      mgmt_fee_percent: p.mgmt_fee_percent,
      fee_basis: p.fee_basis,
      payouts,
      cleaning,
      expenses,
      payouts_cents: payoutsCents,
      cleaning_cents: cleaningCents,
      fee_cents: feeCents,
      expenses_cents: expensesCents,
      net_cents: payoutsCents - cleaningCents - feeCents - expensesCents,
    };
  });

  const sum = (f: (s: StatementPropertySection) => number) => sections.reduce((t, s) => t + f(s), 0);
  const months: StatementMonthRow[] = monthKeys(start, end).map((m) => {
    const inMonth = (d: string | null) => Boolean(d) && (d as string).slice(0, 7) === m;
    const payouts = sections.reduce((t, s) => t + s.payouts.filter((r) => inMonth(r.date ?? start)).reduce((a, r) => a + r.amount_cents, 0), 0);
    const cleaning = sections.reduce((t, s) => t + s.cleaning.filter((r) => inMonth(r.date)).reduce((a, r) => a + r.amount_cents, 0), 0);
    const expenses = sections.reduce((t, s) => t + s.expenses.filter((r) => inMonth(r.date)).reduce((a, r) => a + r.amount_cents, 0), 0);
    const fee = monthFees.get(m) ?? 0;
    return { month: m, payouts_cents: payouts, cleaning_cents: cleaning, fee_cents: fee, expenses_cents: expenses, net_cents: payouts - cleaning - fee - expenses };
  });
  return {
    version: 1,
    client_name: input.clientName,
    organization_name: input.organizationName,
    period_start: start,
    period_end: end,
    generated_at: input.generatedAt,
    currency,
    properties: sections,
    payouts_cents: sum((s) => s.payouts_cents),
    cleaning_cents: sum((s) => s.cleaning_cents),
    fee_cents: sum((s) => s.fee_cents),
    expenses_cents: sum((s) => s.expenses_cents),
    net_cents: sum((s) => s.net_cents),
    months,
    excluded_payouts: [...excluded].map(([c, e]) => ({ currency: c, count: e.count, total_cents: e.total })),
  };
}

// A local copy of ./money.ts's formatCents, kept inline so this file stays
// import-free like the rest of it (every other function here is plain
// arithmetic on plain data) and runnable by plain `node --test` with no
// module resolution to configure. Keep the two in sync if the money
// formatting ever changes.
function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// "October 2026" for a single-month statement; the financial-year label
// (e.g. "FY 2025–26") for one that spans several months, matching how
// the saved statement already labels itself elsewhere.
function periodLabel(s: StatementSnapshot): string {
  if (s.months && s.months.length > 1) return fyLabelFromDates(s.period_start, s.period_end);
  const d = new Date(`${s.period_start}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

// A short, plain-language paragraph of the headline numbers, meant to sit
// above the tables so an owner can read the gist without parsing every
// row. Deliberately templated/rule-based -- built only from totals the
// snapshot already carries, with no AI call and nothing it can get wrong
// that buildStatement() itself didn't already compute. Returns "" for a
// client with no properties assigned (StatementDocument shows its own
// message for that case).
export function buildOwnerSummary(s: StatementSnapshot): string {
  if (s.properties.length === 0) return "";

  const money = (c: number) => formatMoney(c, s.currency);
  const period = periodLabel(s);
  const propertyCount = s.properties.length;
  // No direct booking count on the snapshot -- one cleaning row is
  // charged per booking whose checkout falls in the period, so the
  // number of cleaning rows is the number of completed stays.
  const stays = s.properties.reduce((t, p) => t + p.cleaning.length, 0);

  const noActivity = s.payouts_cents === 0 && s.cleaning_cents === 0 && s.expenses_cents === 0 && stays === 0;
  if (noActivity) {
    return propertyCount === 1
      ? `No payouts, cleans or expenses were recorded for ${s.properties[0].property_name} in ${period}.`
      : `No payouts, cleans or expenses were recorded across your ${propertyCount} properties in ${period}.`;
  }

  const stayWord = stays === 1 ? "stay" : "stays";
  const opening =
    propertyCount === 1
      ? `In ${period}, ${s.properties[0].property_name} had ${stays} ${stayWord}, bringing in ${money(s.payouts_cents)} in payouts.`
      : `Across your ${propertyCount} properties in ${period}, there ${stays === 1 ? "was" : "were"} ${stays} ${stayWord} in total, bringing in ${money(s.payouts_cents)} in payouts.`;

  const deductions: string[] = [];
  if (s.cleaning_cents > 0) deductions.push(`${money(s.cleaning_cents)} in cleaning`);
  if (s.fee_cents > 0) deductions.push(`${money(s.fee_cents)} in management fees`);
  if (s.expenses_cents > 0) deductions.push(`${money(s.expenses_cents)} in expenses`);

  const netPhrase =
    s.net_cents < 0 ? `a shortfall of ${money(Math.abs(s.net_cents))} owed by the owner` : `a net payout of ${money(s.net_cents)}`;
  const costSentence =
    deductions.length === 0
      ? `With no cleaning, management fees or expenses charged this period, that left ${netPhrase}.`
      : `After ${joinWithAnd(deductions)}, that left ${netPhrase}.`;

  const sentences = [opening, costSentence];

  // Only worth calling out a standout property when there's more than one
  // to compare, and only when it actually netted something -- a top
  // "performer" that lost the least money isn't a useful headline.
  if (propertyCount > 1) {
    const top = [...s.properties].sort((a, b) => b.net_cents - a.net_cents)[0];
    if (top && top.net_cents > 0) {
      sentences.push(`${top.property_name} was the strongest performer, netting ${money(top.net_cents)}.`);
    }
  }

  return sentences.join(" ");
}
