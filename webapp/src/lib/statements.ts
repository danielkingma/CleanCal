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
}

// Australian financial year: 1 July to 30 June. fy = the starting year,
// so FY 2025-26 is fy 2025.
export function fyRange(fy: number): { start: string; end: string } {
  return { start: `${fy}-07-01`, end: `${fy + 1}-06-30` };
}
export function fyLabel(fy: number): string {
  return `FY ${fy}\u2013${String(fy + 1).slice(2)}`;
}
export function currentFY(today: string): number {
  const y = Number(today.slice(0, 4));
  return Number(today.slice(5, 7)) >= 7 ? y : y - 1;
}
// "2026-10" -> a month; "fy2025" -> a financial year; anything else null.
export function periodRange(key: string): { start: string; end: string; kind: "month" | "fy" } | null {
  const fy = /^fy(\d{4})$/.exec(key);
  if (fy) return { ...fyRange(Number(fy[1])), kind: "fy" };
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
  start: string;
  end: string;
  generatedAt: string;
  properties: StatementProperty[];
  lines: StatementPayoutLine[];
  bookings: StatementBooking[];
  expenses: StatementExpense[];
}): StatementSnapshot {
  const { start, end } = input;
  const monthFees = new Map<string, number>();
  const sections: StatementPropertySection[] = input.properties.map((p) => {
    const payouts = input.lines
      .filter((l) => l.property_id === p.id && inRange(l.payout_date ?? l.checkin_date, start, end))
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
    currency: "AUD",
    properties: sections,
    payouts_cents: sum((s) => s.payouts_cents),
    cleaning_cents: sum((s) => s.cleaning_cents),
    fee_cents: sum((s) => s.fee_cents),
    expenses_cents: sum((s) => s.expenses_cents),
    net_cents: sum((s) => s.net_cents),
    months,
  };
}
