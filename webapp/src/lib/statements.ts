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
    const feeBase = p.fee_basis === "gross" ? payoutsCents : payoutsCents - cleaningCents;
    const feeCents = Math.max(0, Math.round((feeBase * p.mgmt_fee_percent) / 100));
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
  };
}
