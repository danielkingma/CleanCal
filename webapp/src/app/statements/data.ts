import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addDaysISO,
  buildStatement,
  type StatementProperty,
  type StatementSnapshot,
} from "@/lib/statements";

export interface PeriodExpense {
  id: string;
  property_id: string;
  expense_date: string;
  description: string;
  amount_cents: number;
}

// Loads everything a statement needs for one client and period (RLS
// keeps it to the caller's organisation) and runs the calculation.
export async function loadStatement(
  supabase: SupabaseClient,
  ownerId: string,
  start: string,
  end: string,
): Promise<{ snapshot: StatementSnapshot; expenses: PeriodExpense[]; properties: { id: string; name: string }[] } | null> {
  const { data: owner } = await supabase.from("property_owners").select("id, name, organization_id").eq("id", ownerId).maybeSingle();
  if (!owner) return null;

  const [{ data: org }, { data: financials }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", owner.organization_id).maybeSingle(),
    supabase
      .from("property_financials")
      .select("property_id, mgmt_fee_percent, fee_basis, owner_cleaning_charge_cents")
      .eq("property_owner_id", ownerId),
  ]);
  const ids = (financials ?? []).map((f) => f.property_id as string);

  let props: StatementProperty[] = [];
  let lines: Parameters<typeof buildStatement>[0]["lines"] = [];
  let bookings: Parameters<typeof buildStatement>[0]["bookings"] = [];
  let expenses: PeriodExpense[] = [];
  let propertyList: { id: string; name: string }[] = [];

  if (ids.length > 0) {
    const [{ data: properties }, { data: lineRows }, { data: bookingRows }, { data: expenseRows }] = await Promise.all([
      supabase.from("properties").select("id, name, payout_rate_cents, linen_box_count, linen_fee_cents").in("id", ids).order("name"),
      supabase
        .from("payout_lines")
        .select("property_id, line_type, guest_name, checkin_date, nights, payout_date, amount_cents, platform, confirmation_code")
        .in("property_id", ids)
        .neq("match_status", "ignored")
        .or(`and(payout_date.gte.${start},payout_date.lte.${end}),and(payout_date.is.null,checkin_date.gte.${start},checkin_date.lte.${end})`),
      supabase
        .from("bookings")
        .select("property_id, checkin_date, nights, guests, linen_pickup")
        .in("property_id", ids)
        .gte("checkin_date", addDaysISO(start, -31))
        .lte("checkin_date", end),
      supabase
        .from("owner_expenses")
        .select("id, property_id, expense_date, description, amount_cents")
        .in("property_id", ids)
        .gte("expense_date", start)
        .lte("expense_date", end)
        .order("expense_date"),
    ]);
    // PostgREST returns at most 1000 rows per query; never silently
    // under-report a statement.
    if ((lineRows?.length ?? 0) >= 1000 || (bookingRows?.length ?? 0) >= 1000 || (expenseRows?.length ?? 0) >= 1000) {
      throw new Error("Too many records for one statement. Try a single month instead.");
    }
    const fin = new Map((financials ?? []).map((f) => [f.property_id as string, f]));
    props = (properties ?? []).map((p) => {
      const f = fin.get(p.id as string)!;
      return {
        id: p.id as string,
        name: p.name as string,
        payout_rate_cents: (p.payout_rate_cents as number | null) ?? null,
        linen_box_count: Number(p.linen_box_count ?? 0),
        linen_fee_cents: Number(p.linen_fee_cents ?? 0),
        mgmt_fee_percent: Number(f.mgmt_fee_percent),
        fee_basis: f.fee_basis as "gross" | "net_of_cleaning",
        owner_cleaning_charge_cents: (f.owner_cleaning_charge_cents as number | null) ?? null,
      };
    });
    propertyList = props.map((p) => ({ id: p.id, name: p.name }));
    lines = (lineRows ?? []) as typeof lines;
    bookings = (bookingRows ?? []) as typeof bookings;
    expenses = (expenseRows ?? []) as PeriodExpense[];
  }

  const snapshot = buildStatement({
    clientName: owner.name as string,
    organizationName: (org?.name as string) ?? "",
    start,
    end,
    generatedAt: new Date().toISOString(),
    properties: props,
    lines,
    bookings,
    expenses,
  });
  return { snapshot, expenses, properties: propertyList };
}
